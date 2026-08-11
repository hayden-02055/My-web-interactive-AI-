import importlib
import json

import numpy as np
import pytest

from app.agent.tools import execute_tool
from app.knowledge.loader import KnowledgeChunkMeta, KnowledgeIndex, set_knowledge_index

# Same shadowing issue as test_knowledge_search.py: app.knowledge.__init__
# rebinds `search` to the function, so pull the submodule directly to
# monkeypatch its `embed_texts` reference.
search_module = importlib.import_module("app.knowledge.search")


def _chunk(id_: str, section: str, anchor: str, content: str = "content") -> KnowledgeChunkMeta:
    return KnowledgeChunkMeta(id=id_, section=section, anchor=anchor, label=id_, content=content)


@pytest.fixture(autouse=True)
def _index() -> None:
    chunks = [
        _chunk("about", "about", "about", "About content"),
        _chunk("experience-fingoo", "experience", "experience-fingoo", "Fingoo card"),
        _chunk(
            "experience-fingoo-overview",
            "experience",
            "experience-fingoo-overview",
            "Fingoo overview",
        ),
    ]
    vectors = np.array([[1.0, 0.0], [0.0, 1.0], [0.0, 1.0]], dtype=np.float32)
    set_knowledge_index(KnowledgeIndex(chunks=chunks, vectors=vectors))


async def test_search_portfolio_returns_results(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(search_module, "embed_texts", lambda texts: [[1.0, 0.0]])

    payload, event = await execute_tool("search_portfolio", json.dumps({"query": "about"}))

    assert event is None
    assert payload["results"][0]["anchor"] == "about"


async def test_search_portfolio_invalid_arguments() -> None:
    payload, event = await execute_tool("search_portfolio", json.dumps({}))
    assert payload == {"error": "invalid_arguments"}
    assert event is None


async def test_get_case_study_returns_all_chunks() -> None:
    payload, event = await execute_tool("get_case_study", json.dumps({"case_study_id": "fingoo"}))
    anchors = {c["anchor"] for c in payload["chunks"]}
    assert anchors == {"experience-fingoo", "experience-fingoo-overview"}
    assert event is None


async def test_get_case_study_unknown_id() -> None:
    payload, _ = await execute_tool("get_case_study", json.dumps({"case_study_id": "nope"}))
    assert payload == {"error": "case_study_not_found"}


async def test_suggest_section_rejects_unknown_anchor() -> None:
    payload, event = await execute_tool(
        "suggest_section",
        json.dumps({"anchor": "does-not-exist", "label": "x", "reason": "y"}),
    )
    assert payload == {"error": "unknown_anchor"}
    assert event is None


async def test_suggest_section_accepts_known_anchor() -> None:
    payload, event = await execute_tool(
        "suggest_section",
        json.dumps({"anchor": "experience-fingoo", "label": "View Fingoo", "reason": "y"}),
    )
    assert payload == {"status": "ok"}
    assert event is not None
    event_name, section_event = event
    assert event_name == "suggestion"
    assert section_event.target == "#experience-fingoo"


async def test_generate_mvp_outline_drops_unknown_case_study_ids() -> None:
    payload, event = await execute_tool(
        "generate_mvp_outline",
        json.dumps(
            {
                "goal": "g",
                "pipeline": ["a"],
                "mvp_scope": ["b"],
                "relevant_case_studies": ["fingoo", "not-a-real-project"],
                "caveats": [],
            }
        ),
    )
    assert payload == {"status": "ok"}
    assert event is not None
    event_name, block_event = event
    assert event_name == "answer.block"
    assert block_event.data.relevant_case_studies == ["fingoo"]


async def test_suggest_contact() -> None:
    payload, event = await execute_tool(
        "suggest_contact", json.dumps({"label": "Discuss This Idea", "reason": "y"})
    )
    assert payload == {"status": "ok"}
    assert event is not None
    assert event[0] == "suggestion"


async def test_unknown_tool_name() -> None:
    payload, event = await execute_tool("not_a_real_tool", "{}")
    assert payload == {"error": "unknown_tool"}
    assert event is None


async def test_malformed_json_arguments() -> None:
    payload, event = await execute_tool("search_portfolio", "{not json")
    assert payload == {"error": "invalid_arguments"}
    assert event is None
