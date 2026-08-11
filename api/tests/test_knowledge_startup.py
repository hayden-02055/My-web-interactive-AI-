import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.knowledge.loader import KnowledgeIndexError
from app.main import app

# NOTE: startup/shutdown (the ASGI lifespan protocol) only runs when
# TestClient is used as a context manager — a bare `TestClient(app)` skips
# it, which would make these fail-fast checks a no-op if written without `with`.


def _write_index(path: Path, **overrides: object) -> None:
    base: dict[str, object] = {
        "schema_version": 1,
        "generated_at": "2026-08-11T00:00:00Z",
        "source_schema_version": 1,
        "embedding": {
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "dimensions": settings.embedding_dimensions,
        },
        "chunks": [],
    }
    base.update(overrides)
    path.write_text(json.dumps(base), encoding="utf-8")


def test_lifespan_fails_fast_without_knowledge_index(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(settings, "knowledge_index_path", str(tmp_path / "missing.json"))

    with pytest.raises(KnowledgeIndexError), TestClient(app):
        pass


def test_lifespan_fails_fast_on_embedding_model_mismatch(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    index_path = tmp_path / "knowledge.json"
    _write_index(
        index_path,
        embedding={
            "provider": settings.embedding_provider,
            "model": "some-other-model",
            "dimensions": settings.embedding_dimensions,
        },
    )
    monkeypatch.setattr(settings, "knowledge_index_path", str(index_path))

    with pytest.raises(KnowledgeIndexError), TestClient(app):
        pass


def test_lifespan_loads_index_and_serves_requests(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    index_path = tmp_path / "knowledge.json"
    _write_index(index_path)
    monkeypatch.setattr(settings, "knowledge_index_path", str(index_path))

    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
