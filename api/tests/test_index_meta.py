import numpy as np
import pytest

from app.knowledge.index_meta import anchor_exists, case_study_chunks, case_study_ids, section_ids
from app.knowledge.loader import KnowledgeChunkMeta, KnowledgeIndex, set_knowledge_index


def _chunk(id_: str, section: str, anchor: str) -> KnowledgeChunkMeta:
    return KnowledgeChunkMeta(id=id_, section=section, anchor=anchor, label=id_, content="c")


@pytest.fixture(autouse=True)
def _index() -> None:
    # `sentinel-club` deliberately has a hyphen in its own id, to exercise
    # the anchor-suffix split against a heading key rather than "last hyphen".
    chunks = [
        _chunk("about", "about", "about"),
        _chunk("skills", "skills", "skills"),
        _chunk("experience-fingoo", "experience", "experience-fingoo"),
        _chunk("experience-fingoo-overview", "experience", "experience-fingoo-overview"),
        _chunk("experience-fingoo-architecture", "experience", "experience-fingoo-architecture"),
        _chunk("experience-sentinel-club", "experience", "experience-sentinel-club"),
        _chunk(
            "experience-sentinel-club-problem", "experience", "experience-sentinel-club-problem"
        ),
    ]
    vectors = np.zeros((len(chunks), 3), dtype=np.float32)
    set_knowledge_index(KnowledgeIndex(chunks=chunks, vectors=vectors))


def test_section_ids_reflects_index_contents() -> None:
    assert section_ids() == {"about", "skills", "experience"}


def test_case_study_ids_splits_multi_hyphen_ids_correctly() -> None:
    assert case_study_ids() == {"fingoo", "sentinel-club"}


def test_case_study_chunks_returns_card_and_h2_sections_only_for_that_id() -> None:
    chunks = case_study_chunks("fingoo")
    anchors = {c.anchor for c in chunks}
    assert anchors == {
        "experience-fingoo",
        "experience-fingoo-overview",
        "experience-fingoo-architecture",
    }


def test_case_study_chunks_unknown_id_returns_empty() -> None:
    assert case_study_chunks("does-not-exist") == []


def test_anchor_exists() -> None:
    assert anchor_exists("experience-sentinel-club-problem") is True
    assert anchor_exists("experience-sentinel-club-decisions") is False
