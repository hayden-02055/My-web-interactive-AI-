import numpy as np
import pytest

from app.agent.context import resolve_page_context
from app.knowledge.loader import KnowledgeChunkMeta, KnowledgeIndex, set_knowledge_index
from app.schemas.chat import PageContext


@pytest.fixture(autouse=True)
def _index() -> None:
    chunks = [
        KnowledgeChunkMeta(id="about", section="about", anchor="about", label="About", content="c"),
        KnowledgeChunkMeta(
            id="experience-fingoo",
            section="experience",
            anchor="experience-fingoo",
            label="Fingoo",
            content="c",
        ),
    ]
    set_knowledge_index(KnowledgeIndex(chunks=chunks, vectors=np.zeros((2, 2), dtype=np.float32)))


def test_none_page_context_is_unresolved() -> None:
    assert resolve_page_context(None) == (None, None, False)


def test_known_section_and_case_study_resolve() -> None:
    section, case_study, resolved = resolve_page_context(
        PageContext(section="about", case_study="fingoo")
    )
    assert (section, case_study, resolved) == ("about", "fingoo", True)


def test_unknown_values_are_dropped_not_rejected() -> None:
    section, case_study, resolved = resolve_page_context(
        PageContext(section="not-a-real-section", case_study="not-a-real-project")
    )
    assert (section, case_study, resolved) == (None, None, False)


def test_partial_match_still_counts_as_resolved() -> None:
    section, case_study, resolved = resolve_page_context(
        PageContext(section="about", case_study="not-a-real-project")
    )
    assert (section, case_study, resolved) == ("about", None, True)
