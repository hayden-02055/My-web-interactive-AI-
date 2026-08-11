from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.core.config import settings

EXPECTED_SCHEMA_VERSION = 1

# api/app/knowledge/loader.py -> parents[2] == api/
_API_ROOT = Path(__file__).resolve().parents[2]


class KnowledgeIndexError(RuntimeError):
    """Raised when the committed knowledge index can't be trusted.

    SDD-02 §6.1 — fail fast on startup rather than silently searching a
    stale or wrong-dimension vector space.
    """


@dataclass(frozen=True)
class KnowledgeChunkMeta:
    id: str
    section: str
    anchor: str
    label: str
    content: str


@dataclass(frozen=True)
class KnowledgeIndex:
    chunks: list[KnowledgeChunkMeta]
    vectors: np.ndarray  # L2-normalized, shape (len(chunks), embedding_dimensions)


def _resolve_index_path() -> Path:
    path = Path(settings.knowledge_index_path)
    return path if path.is_absolute() else _API_ROOT / path


def load_knowledge_index(path: Path | None = None) -> KnowledgeIndex:
    index_path = path if path is not None else _resolve_index_path()

    if not index_path.exists():
        raise KnowledgeIndexError(f"knowledge index not found at {index_path}")

    try:
        raw = json.loads(index_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise KnowledgeIndexError(
            f"knowledge index at {index_path} is not valid JSON: {exc}"
        ) from exc

    if raw.get("schema_version") != EXPECTED_SCHEMA_VERSION:
        raise KnowledgeIndexError(
            f"knowledge index schema_version {raw.get('schema_version')!r} "
            f"!= expected {EXPECTED_SCHEMA_VERSION!r}"
        )

    embedding_meta = raw.get("embedding") or {}
    if embedding_meta.get("model") != settings.embedding_model:
        raise KnowledgeIndexError(
            f"knowledge index embedding.model {embedding_meta.get('model')!r} != "
            f"configured EMBEDDING_MODEL {settings.embedding_model!r}"
        )
    if embedding_meta.get("dimensions") != settings.embedding_dimensions:
        raise KnowledgeIndexError(
            f"knowledge index embedding.dimensions {embedding_meta.get('dimensions')!r} != "
            f"configured EMBEDDING_DIMENSIONS {settings.embedding_dimensions!r}"
        )

    raw_chunks = raw.get("chunks") or []
    chunks: list[KnowledgeChunkMeta] = []
    vectors = np.zeros((len(raw_chunks), settings.embedding_dimensions), dtype=np.float32)

    for i, chunk in enumerate(raw_chunks):
        embedding = chunk["embedding"]
        if len(embedding) != settings.embedding_dimensions:
            raise KnowledgeIndexError(
                f"chunk {chunk.get('id')!r} embedding length {len(embedding)} != "
                f"EMBEDDING_DIMENSIONS {settings.embedding_dimensions}"
            )
        chunks.append(
            KnowledgeChunkMeta(
                id=chunk["id"],
                section=chunk["section"],
                anchor=chunk["anchor"],
                label=chunk["label"],
                content=chunk["content"],
            )
        )
        vectors[i] = embedding

    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normalized_vectors = vectors / norms

    return KnowledgeIndex(chunks=chunks, vectors=normalized_vectors)


_index: KnowledgeIndex | None = None


def set_knowledge_index(index: KnowledgeIndex) -> None:
    global _index
    _index = index


def get_knowledge_index() -> KnowledgeIndex:
    if _index is None:
        raise KnowledgeIndexError(
            "knowledge index not loaded — call load_knowledge_index() at startup"
        )
    return _index
