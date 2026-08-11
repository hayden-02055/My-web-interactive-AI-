import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.agent.runner import run_agent
from app.core.errors import DomainError, InvalidRequestError
from app.core.ratelimit import check_and_increment
from app.core.redis_client import get_redis_client
from app.core.session import load_session, new_session_id, save_session
from app.core.sse import format_sse
from app.schemas.chat import ChatRequest
from app.schemas.trace import ErrorDetail, ErrorEvent, SessionEvent

router = APIRouter()


@router.post("/chat")
async def post_chat(chat_request: ChatRequest, request: Request) -> StreamingResponse:
    # §6 steps 1-2 happen before the stream opens: a rejection here is a
    # normal JSON error response, not an SSE frame (nothing has streamed yet).
    if chat_request.session_id is not None:
        try:
            uuid.UUID(chat_request.session_id)
        except ValueError as exc:
            raise InvalidRequestError("session_id must be a UUID.") from exc

    session_id = chat_request.session_id or new_session_id()
    client_ip = request.client.host if request.client else "unknown"

    redis_client = get_redis_client()
    # Ahead of any LLM/embedding call (INV-07) — fail closed on Redis errors (§7.3).
    await check_and_increment(redis_client, ip=client_ip, session_id=session_id)

    session, resumed = await load_session(redis_client, session_id)
    if chat_request.session_id is not None and not resumed:
        # The client remembered a session_id, but Redis has no record for
        # it (TTL expired, or the server restarted) — issue a genuinely new
        # id rather than quietly reusing theirs. If we kept the old id, the
        # client's "did the id change?" check (SDD-04 DD-23 `contextReset`)
        # could never fire, since resuming and silently-reset-under-the-
        # same-id would be indistinguishable to it.
        session_id = new_session_id()
    session.session_id = session_id

    async def event_stream() -> AsyncIterator[str]:
        yield format_sse("session", SessionEvent(session_id=session_id, resumed=resumed))
        try:
            async for event_name, payload in run_agent(request=chat_request, session=session):
                yield format_sse(event_name, payload)
            # Only reached on a clean finish — a dropped connection lets the
            # generator get cancelled before this line, so no partial turn
            # is ever persisted (§6 "중단 처리").
            await save_session(redis_client, session)
        except DomainError as exc:
            detail = ErrorDetail(code=exc.code, message=exc.message, retry_after=exc.retry_after)
            yield format_sse("error", ErrorEvent(error=detail))
        except Exception:  # noqa: BLE001 — must still end in one `error` frame, not a 500
            # Headers are already committed to text/event-stream at this
            # point, so an unexpected failure must still end in exactly one
            # `error` frame (§3.3), never a raw 500.
            detail = ErrorDetail(
                code="AGENT_FAILED", message="Something went wrong. Please try again."
            )
            yield format_sse("error", ErrorEvent(error=detail))

    return StreamingResponse(event_stream(), media_type="text/event-stream")
