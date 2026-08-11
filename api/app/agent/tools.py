import json
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from app.knowledge.index_meta import anchor_exists, case_study_chunks, case_study_ids
from app.knowledge.search import search
from app.schemas.trace import (
    AnswerBlockEvent,
    ContactSuggestionEvent,
    MvpOutlineData,
    SectionSuggestionEvent,
)

# SDD-03 §4 — tool argument contracts (used both to generate the OpenAI
# function-calling JSON schema and to validate the model's returned
# arguments before anything touches the knowledge index or emits an event).


class SearchPortfolioArgs(BaseModel):
    query: str
    section: str | None = None


class GetCaseStudyArgs(BaseModel):
    case_study_id: str


class SuggestSectionArgs(BaseModel):
    anchor: str
    label: str
    reason: str


class GenerateMvpOutlineArgs(BaseModel):
    goal: str
    pipeline: list[str]
    mvp_scope: list[str]
    relevant_case_studies: list[str] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list)


class SuggestContactArgs(BaseModel):
    label: str
    reason: str


def _schema(name: str, description: str, args_model: type[BaseModel]) -> dict[str, Any]:
    parameters = args_model.model_json_schema()
    parameters.pop("title", None)
    return {
        "type": "function",
        "function": {"name": name, "description": description, "parameters": parameters},
    }


TOOL_SPECS: list[dict[str, Any]] = [
    _schema(
        "search_portfolio",
        "Search the portfolio knowledge index for content relevant to a query. "
        "A search has already run before your turn started; use this only to refine "
        "with a different query or narrow to one section.",
        SearchPortfolioArgs,
    ),
    _schema(
        "get_case_study",
        "Fetch every section of one Case Study by id. Prefer this over search_portfolio "
        "when the visitor asks for a full walkthrough of a specific project.",
        GetCaseStudyArgs,
    ),
    _schema(
        "suggest_section",
        "Propose a navigation target already present on the page. The server rejects "
        "anchors that don't exist, so only call this after search/get_case_study confirmed one.",
        SuggestSectionArgs,
    ),
    _schema(
        "generate_mvp_outline",
        "Produce a structured MVP outline for a solution-consulting question. This tool "
        "does not generate visible text itself — pass the outline as structured arguments.",
        GenerateMvpOutlineArgs,
    ),
    _schema(
        "suggest_contact",
        "Propose that the visitor reach out to Haewon directly.",
        SuggestContactArgs,
    ),
]

ToolEvent = tuple[str, BaseModel]


async def execute_tool(name: str, arguments_json: str) -> tuple[dict[str, Any], ToolEvent | None]:
    """Returns (payload sent back to the model, optional (event_name, event) to emit)."""
    try:
        raw_args: dict[str, Any] = json.loads(arguments_json) if arguments_json else {}
    except json.JSONDecodeError:
        return {"error": "invalid_arguments"}, None

    if name == "search_portfolio":
        return _run_search_portfolio(raw_args)
    if name == "get_case_study":
        return _run_get_case_study(raw_args)
    if name == "suggest_section":
        return _run_suggest_section(raw_args)
    if name == "generate_mvp_outline":
        return _run_generate_mvp_outline(raw_args)
    if name == "suggest_contact":
        return _run_suggest_contact(raw_args)
    return {"error": "unknown_tool"}, None


def _run_search_portfolio(raw_args: dict[str, Any]) -> tuple[dict[str, Any], ToolEvent | None]:
    try:
        args = SearchPortfolioArgs.model_validate(raw_args)
    except ValidationError:
        return {"error": "invalid_arguments"}, None
    results = search(args.query, section=args.section)
    return {"results": [r.model_dump() for r in results]}, None


def _run_get_case_study(raw_args: dict[str, Any]) -> tuple[dict[str, Any], ToolEvent | None]:
    try:
        args = GetCaseStudyArgs.model_validate(raw_args)
    except ValidationError:
        return {"error": "invalid_arguments"}, None
    chunks = case_study_chunks(args.case_study_id)
    if not chunks:
        return {"error": "case_study_not_found"}, None
    return {
        "chunks": [{"anchor": c.anchor, "label": c.label, "content": c.content} for c in chunks]
    }, None


def _run_suggest_section(raw_args: dict[str, Any]) -> tuple[dict[str, Any], ToolEvent | None]:
    try:
        args = SuggestSectionArgs.model_validate(raw_args)
    except ValidationError:
        return {"error": "invalid_arguments"}, None
    # §4.3 — the server verifies the anchor, not the model: never route a
    # visitor to a suggestion that doesn't exist in the DOM.
    if not anchor_exists(args.anchor):
        return {"error": "unknown_anchor"}, None
    event = SectionSuggestionEvent(label=args.label, target=f"#{args.anchor}", reason=args.reason)
    return {"status": "ok"}, ("suggestion", event)


def _run_generate_mvp_outline(raw_args: dict[str, Any]) -> tuple[dict[str, Any], ToolEvent | None]:
    try:
        args = GenerateMvpOutlineArgs.model_validate(raw_args)
    except ValidationError:
        return {"error": "invalid_arguments"}, None
    valid_ids = case_study_ids()
    relevant = [cid for cid in args.relevant_case_studies if cid in valid_ids]
    data = MvpOutlineData(
        goal=args.goal,
        pipeline=args.pipeline,
        mvp_scope=args.mvp_scope,
        relevant_case_studies=relevant,
        caveats=args.caveats,
    )
    event = AnswerBlockEvent(type="mvp_outline", data=data)
    return {"status": "ok"}, ("answer.block", event)


def _run_suggest_contact(raw_args: dict[str, Any]) -> tuple[dict[str, Any], ToolEvent | None]:
    try:
        args = SuggestContactArgs.model_validate(raw_args)
    except ValidationError:
        return {"error": "invalid_arguments"}, None
    event = ContactSuggestionEvent(label=args.label, reason=args.reason)
    return {"status": "ok"}, ("suggestion", event)
