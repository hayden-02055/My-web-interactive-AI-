import json
from pathlib import Path
from typing import Any

import pytest

from app.core.config import settings
from app.knowledge.loader import KnowledgeIndexError, load_knowledge_index


def write_index(path: Path, **overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "schema_version": 1,
        "generated_at": "2026-08-11T00:00:00Z",
        "source_schema_version": 1,
        "embedding": {
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "dimensions": 3,
        },
        "chunks": [
            {
                "id": "about",
                "section": "about",
                "anchor": "about",
                "label": "About",
                "content": "about content",
                "content_hash": "sha256:deadbeef",
                "embedding": [1.0, 2.0, 2.0],
            }
        ],
    }
    base.update(overrides)
    path.write_text(json.dumps(base), encoding="utf-8")
    return base


def test_load_knowledge_index_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "embedding_dimensions", 3)
    path = tmp_path / "knowledge.json"
    write_index(path)

    index = load_knowledge_index(path)

    assert len(index.chunks) == 1
    assert index.chunks[0].id == "about"
    # L2-normalized: [1, 2, 2] has norm 3
    assert index.vectors[0] == pytest.approx([1 / 3, 2 / 3, 2 / 3])


def test_missing_file_raises(tmp_path: Path) -> None:
    with pytest.raises(KnowledgeIndexError, match="not found"):
        load_knowledge_index(tmp_path / "missing.json")


def test_invalid_json_raises(tmp_path: Path) -> None:
    path = tmp_path / "knowledge.json"
    path.write_text("{not json", encoding="utf-8")
    with pytest.raises(KnowledgeIndexError, match="not valid JSON"):
        load_knowledge_index(path)


def test_schema_version_mismatch_raises(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "embedding_dimensions", 3)
    path = tmp_path / "knowledge.json"
    write_index(path, schema_version=2)
    with pytest.raises(KnowledgeIndexError, match="schema_version"):
        load_knowledge_index(path)


def test_embedding_model_mismatch_raises(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "embedding_dimensions", 3)
    path = tmp_path / "knowledge.json"
    write_index(path, embedding={"provider": "openai", "model": "wrong-model", "dimensions": 3})
    with pytest.raises(KnowledgeIndexError, match="embedding.model"):
        load_knowledge_index(path)


def test_dimensions_mismatch_raises(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "embedding_dimensions", 3)
    path = tmp_path / "knowledge.json"
    write_index(
        path,
        embedding={
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "dimensions": 99,
        },
    )
    with pytest.raises(KnowledgeIndexError, match="dimensions"):
        load_knowledge_index(path)


def test_vector_length_mismatch_raises(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "embedding_dimensions", 3)
    path = tmp_path / "knowledge.json"
    write_index(
        path,
        chunks=[
            {
                "id": "about",
                "section": "about",
                "anchor": "about",
                "label": "About",
                "content": "about content",
                "content_hash": "sha256:deadbeef",
                "embedding": [1.0, 2.0],
            }
        ],
    )
    with pytest.raises(KnowledgeIndexError, match="embedding length"):
        load_knowledge_index(path)
