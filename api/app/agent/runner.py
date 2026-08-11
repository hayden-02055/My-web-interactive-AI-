import asyncio
import json
import time
from collections.abc import AsyncIterator
from typing import Any, Literal

from app.agent.context import resolve_page_context
from app.agent.llm import get_llm_client
from app.agent.prompts import (
    build_page_context_message,
    build_retrieved_context_message,
    build_system_prompt,
)
from app.agent.tools import TOOL_SPECS, execute_tool
from app.core.config import settings
from app.core.session import SessionRecord, SessionTurn
from app.knowledge.search import search
from app.schemas.chat import ChatRequest
from app.schemas.trace import (
    AnswerDeltaEvent,
    AnswerDoneEvent,
    FindingContextDetail,
    GeneratingAnswerDetail,
    Intent,
    RetrievalResultItem,
    RetrievingExperienceDetail,
    SelectingActionDetail,
    ToolCallResult,
    TraceMetaEvent,
    TraceStepEvent,
    UnderstandingDetail,
)

# SDD-03 §4.6 — fixed execution constants, distinct from §10's tunable env block.
MAX_TOOL_CALLS_PER_ROUND = 4
TOOL_TIMEOUT_SECONDS = 5

AgentEvent = tuple[str, Any]


def _elapsed_ms(start: float) -> int:
    return int((time.monotonic() - start) * 1000)


def _derive_intent(tool_names: set[str], retrieved_count: int) -> Intent:
    """DD-16 — intent is read off what actually ran, never a separate classifier call."""
    if "generate_mvp_outline" in tool_names:
        return "solution_consulting"
    if "get_case_study" in tool_names:
        return "case_study_inquiry"
    if retrieved_count > 0:
        return "portfolio_question"
    return "general"


def _build_messages(
    *,
    section: str | None,
    case_study: str | None,
    retrieved: list[Any],
    history: list[SessionTurn],
    user_message: str,
) -> list[dict[str, Any]]:
    # §9.1 trust boundary — the user's text only ever appears in a `role:
    # "user"` turn of its own; it is never concatenated into a system string.
    messages: list[dict[str, Any]] = [{"role": "system", "content": build_system_prompt()}]
    page_context_message = build_page_context_message(section=section, case_study=case_study)
    if page_context_message is not None:
        messages.append({"role": "system", "content": page_context_message})
    messages.append({"role": "system", "content": build_retrieved_context_message(retrieved)})
    for turn in history:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": user_message})
    return messages


async def _execute_tool_round(
    tool_calls: list[dict[str, str]],
) -> tuple[list[ToolCallResult], list[dict[str, Any]], list[AgentEvent]]:
    round_results: list[ToolCallResult] = []
    tool_messages: list[dict[str, Any]] = []
    side_events: list[AgentEvent] = []

    for call in tool_calls[:MAX_TOOL_CALLS_PER_ROUND]:
        call_started = time.monotonic()
        try:
            payload, event = await asyncio.wait_for(
                execute_tool(call["name"], call["arguments"]), timeout=TOOL_TIMEOUT_SECONDS
            )
            status: Literal["ok", "error"] = "error" if "error" in payload else "ok"
        except Exception:  # noqa: BLE001 — one bad tool call must not kill the SSE stream
            payload, event, status = {"error": "tool_failed"}, None, "error"
        duration_ms = int((time.monotonic() - call_started) * 1000)
        round_results.append(
            ToolCallResult(name=call["name"], status=status, duration_ms=duration_ms)
        )
        tool_messages.append(
            {
                "role": "tool",
                "tool_call_id": call["id"],
                "content": json.dumps(payload, ensure_ascii=False),
            }
        )
        if event is not None:
            side_events.append(event)

    return round_results, tool_messages, side_events


async def run_agent(*, request: ChatRequest, session: SessionRecord) -> AsyncIterator[AgentEvent]:
    start = time.monotonic()

    # -- understanding --
    step_started = _elapsed_ms(start)
    yield (
        "trace.step",
        TraceStepEvent(
            id="understanding",
            stage="understanding",
            status="started",
            label="Understanding",
            started_at_ms=step_started,
        ),
    )
    history_turns = len(session.turns)
    yield (
        "trace.step",
        TraceStepEvent(
            id="understanding",
            stage="understanding",
            status="completed",
            label="Understanding",
            started_at_ms=step_started,
            duration_ms=_elapsed_ms(start) - step_started,
            detail=UnderstandingDetail(
                message_chars=len(request.message), history_turns=history_turns
            ),
        ),
    )

    # -- finding_context + retrieving_experience (DD-14: pre-search runs
    # once per turn, before the model is ever called) --
    section, case_study, resolved = resolve_page_context(request.page_context)

    finding_started = _elapsed_ms(start)
    yield (
        "trace.step",
        TraceStepEvent(
            id="finding_context",
            stage="finding_context",
            status="started",
            label="Finding Context",
            started_at_ms=finding_started,
        ),
    )
    retrieval_started = _elapsed_ms(start)
    yield (
        "trace.step",
        TraceStepEvent(
            id="retrieval",
            stage="retrieving_experience",
            status="started",
            label="Retrieving Experience",
            started_at_ms=retrieval_started,
        ),
    )
    loop = asyncio.get_running_loop()
    retrieved = await loop.run_in_executor(None, lambda: search(request.message, section=section))

    yield (
        "trace.step",
        TraceStepEvent(
            id="finding_context",
            stage="finding_context",
            status="completed",
            label="Finding Context",
            started_at_ms=finding_started,
            duration_ms=_elapsed_ms(start) - finding_started,
            detail=FindingContextDetail(section=section, case_study=case_study, resolved=resolved),
        ),
    )
    yield (
        "trace.step",
        TraceStepEvent(
            id="retrieval",
            stage="retrieving_experience",
            status="completed",
            label="Retrieving Experience",
            started_at_ms=retrieval_started,
            duration_ms=_elapsed_ms(start) - retrieval_started,
            detail=RetrievingExperienceDetail(
                result_count=len(retrieved),
                results=[
                    RetrievalResultItem(anchor=r.anchor, label=r.label, score=r.score)
                    for r in retrieved
                ],
                min_score=settings.retrieval_min_score,
            ),
        ),
    )

    messages = _build_messages(
        section=section,
        case_study=case_study,
        retrieved=retrieved,
        history=session.turns,
        user_message=request.message,
    )

    llm = get_llm_client()
    tool_names_used: set[str] = set()
    final_answer_parts: list[str] = []
    generation_tokens = 0
    budget_exceeded = False
    answered = False

    for round_index in range(1, settings.max_tool_rounds + 1):
        if _elapsed_ms(start) > settings.request_budget_seconds * 1000:
            budget_exceeded = True
            break

        round_started = _elapsed_ms(start)
        stream = await llm.chat.completions.create(  # type: ignore[call-overload]
            model=settings.llm_model,
            messages=messages,
            tools=TOOL_SPECS,
            max_tokens=settings.llm_max_output_tokens,
            stream=True,
            stream_options={"include_usage": True},
        )

        content_parts: list[str] = []
        tool_call_chunks: dict[int, dict[str, str]] = {}
        branch: Literal["content", "tools"] | None = None
        usage_tokens = 0

        async for chunk in stream:
            if chunk.usage is not None:
                usage_tokens = chunk.usage.completion_tokens
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta

            # Content and tool_calls are mutually exclusive within one
            # completion, so the first non-empty delta fixes the branch —
            # we emit the matching "started" trace.step right there instead
            # of guessing ahead of time (INV-05: no staged steps).
            if delta.content:
                if branch is None:
                    branch = "content"
                    yield (
                        "trace.step",
                        TraceStepEvent(
                            id="selecting_action",
                            stage="selecting_action",
                            status="skipped",
                            label="Selecting Action",
                            started_at_ms=round_started,
                        ),
                    )
                    yield (
                        "trace.step",
                        TraceStepEvent(
                            id="generating_answer",
                            stage="generating_answer",
                            status="started",
                            label="Generating Answer",
                            started_at_ms=round_started,
                        ),
                    )
                content_parts.append(delta.content)
                yield "answer.delta", AnswerDeltaEvent(text=delta.content)
            if delta.tool_calls:
                if branch is None:
                    branch = "tools"
                    yield (
                        "trace.step",
                        TraceStepEvent(
                            id="selecting_action"
                            if round_index == 1
                            else f"selecting_action:{round_index}",
                            stage="selecting_action",
                            status="started",
                            label="Selecting Action",
                            started_at_ms=round_started,
                        ),
                    )
                for tc_delta in delta.tool_calls:
                    entry = tool_call_chunks.setdefault(
                        tc_delta.index, {"id": "", "name": "", "arguments": ""}
                    )
                    if tc_delta.id:
                        entry["id"] = tc_delta.id
                    if tc_delta.function is not None:
                        if tc_delta.function.name:
                            entry["name"] += tc_delta.function.name
                        if tc_delta.function.arguments:
                            entry["arguments"] += tc_delta.function.arguments

        if branch != "tools":
            # No tool call materialized this round (including the
            # zero-chunk edge case) — whatever content streamed is the
            # final answer; no second round-trip to "generate" it again.
            if branch is None:
                yield (
                    "trace.step",
                    TraceStepEvent(
                        id="selecting_action",
                        stage="selecting_action",
                        status="skipped",
                        label="Selecting Action",
                        started_at_ms=round_started,
                    ),
                )
                yield (
                    "trace.step",
                    TraceStepEvent(
                        id="generating_answer",
                        stage="generating_answer",
                        status="started",
                        label="Generating Answer",
                        started_at_ms=round_started,
                    ),
                )
            final_answer_parts = content_parts
            generation_tokens = usage_tokens
            yield (
                "trace.step",
                TraceStepEvent(
                    id="generating_answer",
                    stage="generating_answer",
                    status="completed",
                    label="Generating Answer",
                    started_at_ms=round_started,
                    duration_ms=_elapsed_ms(start) - round_started,
                    detail=GeneratingAnswerDetail(
                        model=settings.llm_model, output_tokens=generation_tokens
                    ),
                ),
            )
            answered = True
            break

        tool_calls = [tool_call_chunks[i] for i in sorted(tool_call_chunks)]
        messages.append(
            {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["name"], "arguments": tc["arguments"]},
                    }
                    for tc in tool_calls
                ],
            }
        )

        round_results, tool_messages, side_events = await _execute_tool_round(tool_calls)
        messages.extend(tool_messages)
        for event_name, payload in side_events:
            yield event_name, payload
        tool_names_used.update(tc["name"] for tc in tool_calls)

        yield (
            "trace.step",
            TraceStepEvent(
                id="selecting_action" if round_index == 1 else f"selecting_action:{round_index}",
                stage="selecting_action",
                status="completed",
                label="Selecting Action",
                started_at_ms=round_started,
                duration_ms=_elapsed_ms(start) - round_started,
                detail=SelectingActionDetail(tools=round_results, round=round_index),
            ),
        )
    else:
        # §4.6 — round cap reached with a tool call still pending in the
        # last round: force one final, tool-free call to produce an answer.
        gen_started = _elapsed_ms(start)
        yield (
            "trace.step",
            TraceStepEvent(
                id="generating_answer",
                stage="generating_answer",
                status="started",
                label="Generating Answer",
                started_at_ms=gen_started,
            ),
        )
        stream = await llm.chat.completions.create(  # type: ignore[call-overload]
            model=settings.llm_model,
            messages=messages,
            max_tokens=settings.llm_max_output_tokens,
            stream=True,
            stream_options={"include_usage": True},
        )
        usage_tokens = 0
        async for chunk in stream:
            if chunk.usage is not None:
                usage_tokens = chunk.usage.completion_tokens
            if not chunk.choices:
                continue
            delta_text = chunk.choices[0].delta.content
            if delta_text:
                final_answer_parts.append(delta_text)
                yield "answer.delta", AnswerDeltaEvent(text=delta_text)
        generation_tokens = usage_tokens
        yield (
            "trace.step",
            TraceStepEvent(
                id="generating_answer",
                stage="generating_answer",
                status="completed",
                label="Generating Answer",
                started_at_ms=gen_started,
                duration_ms=_elapsed_ms(start) - gen_started,
                detail=GeneratingAnswerDetail(
                    model=settings.llm_model, output_tokens=generation_tokens
                ),
            ),
        )
        answered = True

    if budget_exceeded and not answered:
        # Edge case: the 30s request budget ran out before any round could
        # even start. Not a model output, so no `generating_answer` step —
        # this is a server-composed fallback, sent plainly as content.
        finish_reason: str = "budget_exceeded"
        fallback_text = "This is taking longer than expected. Please try again in a moment."
        final_answer_parts = [fallback_text]
        yield "answer.delta", AnswerDeltaEvent(text=fallback_text)
    else:
        finish_reason = "stop"

    yield "trace.meta", TraceMetaEvent(intent=_derive_intent(tool_names_used, len(retrieved)))

    session.turns.append(SessionTurn(role="user", content=request.message))
    session.turns.append(SessionTurn(role="assistant", content="".join(final_answer_parts)))

    yield (
        "answer.done",
        AnswerDoneEvent(finish_reason=finish_reason, total_latency_ms=_elapsed_ms(start)),
    )
