import importlib

import numpy as np
import pytest

from app.knowledge.loader import KnowledgeChunkMeta, KnowledgeIndex, set_knowledge_index
from app.knowledge.search import search

# `app.knowledge.__init__` re-exports a function also named `search`, which
# shadows the submodule on the package namespace — `import app.knowledge.search
# as x` resolves via that (now-shadowed) attribute, not sys.modules. Pull the
# submodule directly so monkeypatching its `embed_texts` reference actually works.
search_module = importlib.import_module("app.knowledge.search")


def make_index() -> KnowledgeIndex:
    chunks = [
        KnowledgeChunkMeta(
            id="about", section="about", anchor="about", label="About", content="about content"
        ),
        KnowledgeChunkMeta(
            id="skills", section="skills", anchor="skills", label="Skills", content="skills content"
        ),
        KnowledgeChunkMeta(
            id="experience-x",
            section="experience",
            anchor="experience-x",
            label="X",
            content="x content",
        ),
    ]
    vectors = np.array(
        [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.9, 0.1, 0.0],
        ],
        dtype=np.float32,
    )
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return KnowledgeIndex(chunks=chunks, vectors=vectors / norms)


@pytest.fixture(autouse=True)
def _knowledge_index() -> None:
    set_knowledge_index(make_index())


def test_search_ranks_by_cosine_similarity(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(search_module, "embed_texts", lambda texts: [[1.0, 0.0, 0.0]])

    results = search("about query", k=3, min_score=0.0)

    assert [r.anchor for r in results] == ["about", "experience-x", "skills"]
    assert results[0].score == pytest.approx(1.0)


def test_search_filters_by_section(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(search_module, "embed_texts", lambda texts: [[0.9, 0.1, 0.0]])

    results = search("query", k=3, min_score=0.0, section="experience")

    assert all(r.section == "experience" for r in results)
    assert results[0].anchor == "experience-x"


def test_search_returns_empty_below_min_score(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(search_module, "embed_texts", lambda texts: [[0.0, 0.0, 1.0]])

    results = search("irrelevant query", k=3, min_score=0.5)

    assert results == []


def test_search_respects_k(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(search_module, "embed_texts", lambda texts: [[0.5, 0.5, 0.0]])

    results = search("query", k=1, min_score=0.0)

    assert len(results) == 1
