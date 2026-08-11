import pytest
from pydantic import ValidationError

from app.schemas.trace import (
    AnswerDoneEvent,
    ContactSuggestionEvent,
    ErrorDetail,
    RetrievingExperienceDetail,
    SectionSuggestionEvent,
    TraceMetaEvent,
    TraceStepEvent,
)


def test_trace_step_completed_carries_duration_and_detail() -> None:
    event = TraceStepEvent(
        id="retrieval",
        stage="retrieving_experience",
        status="completed",
        label="Retrieving Experience",
        started_at_ms=88,
        duration_ms=142,
        detail=RetrievingExperienceDetail(result_count=0, results=[], min_score=0.3),
    )
    dumped = event.model_dump()
    assert dumped["duration_ms"] == 142
    assert dumped["detail"]["result_count"] == 0


def test_trace_step_started_has_no_duration_by_default() -> None:
    event = TraceStepEvent(
        id="understanding",
        stage="understanding",
        status="started",
        label="Understanding",
        started_at_ms=0,
    )
    assert event.duration_ms is None
    assert event.detail is None


def test_trace_meta_rejects_unknown_intent() -> None:
    with pytest.raises(ValidationError):
        TraceMetaEvent.model_validate({"intent": "not_a_real_intent"})


def test_suggestion_variants_carry_their_own_type_tag() -> None:
    section = SectionSuggestionEvent(label="View Fingoo", target="#experience-fingoo", reason="r")
    contact = ContactSuggestionEvent(label="Discuss This Idea", reason="r")
    assert section.type == "section"
    assert contact.type == "contact"


def test_error_detail_rejects_unknown_code() -> None:
    with pytest.raises(ValidationError):
        ErrorDetail.model_validate({"code": "NOT_A_REAL_CODE", "message": "x"})


def test_answer_done_serializes_finish_reason_and_latency() -> None:
    event = AnswerDoneEvent(finish_reason="stop", total_latency_ms=1842)
    assert event.model_dump() == {"finish_reason": "stop", "total_latency_ms": 1842}
