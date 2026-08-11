from typing import Literal

from pydantic import BaseModel

from app.core.errors import ErrorCode

# SDD-03 §5 — the trace event contract. SDD-04/05/06/07 consume these shapes.
# §5.9: every event is an explicit-field Pydantic model, never an arbitrary
# dict — the schema itself is the leak-prevention boundary (INV-05).


class SessionEvent(BaseModel):
    session_id: str
    resumed: bool


Stage = Literal[
    "understanding",
    "finding_context",
    "retrieving_experience",
    "selecting_action",
    "generating_answer",
]

StepStatus = Literal["started", "completed", "skipped", "failed"]


class UnderstandingDetail(BaseModel):
    message_chars: int
    history_turns: int


class FindingContextDetail(BaseModel):
    section: str | None
    case_study: str | None
    resolved: bool


class RetrievalResultItem(BaseModel):
    anchor: str
    label: str
    score: float


class RetrievingExperienceDetail(BaseModel):
    result_count: int
    results: list[RetrievalResultItem]
    min_score: float


class ToolCallResult(BaseModel):
    name: str
    status: Literal["ok", "error"]
    duration_ms: int


class SelectingActionDetail(BaseModel):
    tools: list[ToolCallResult]
    round: int


class GeneratingAnswerDetail(BaseModel):
    model: str
    output_tokens: int


TraceDetail = (
    UnderstandingDetail
    | FindingContextDetail
    | RetrievingExperienceDetail
    | SelectingActionDetail
    | GeneratingAnswerDetail
)


class TraceStepEvent(BaseModel):
    id: str
    stage: Stage
    status: StepStatus
    label: str
    started_at_ms: int
    duration_ms: int | None = None
    detail: TraceDetail | None = None


Intent = Literal["solution_consulting", "case_study_inquiry", "portfolio_question", "general"]


class TraceMetaEvent(BaseModel):
    intent: Intent


class AnswerDeltaEvent(BaseModel):
    text: str


class MvpOutlineData(BaseModel):
    goal: str
    pipeline: list[str]
    mvp_scope: list[str]
    relevant_case_studies: list[str]
    caveats: list[str]


class AnswerBlockEvent(BaseModel):
    type: Literal["mvp_outline"]
    data: MvpOutlineData


class AnswerDoneEvent(BaseModel):
    finish_reason: str
    total_latency_ms: int


class SectionSuggestionEvent(BaseModel):
    type: Literal["section"] = "section"
    label: str
    target: str
    reason: str


class ContactSuggestionEvent(BaseModel):
    type: Literal["contact"] = "contact"
    label: str
    reason: str


SuggestionEvent = SectionSuggestionEvent | ContactSuggestionEvent


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    retry_after: int | None = None


class ErrorEvent(BaseModel):
    error: ErrorDetail
