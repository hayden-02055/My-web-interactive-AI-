from __future__ import annotations

import numpy as np

from app.core.config import settings
from app.knowledge.embeddings import embed_texts
from app.knowledge.loader import get_knowledge_index
from app.knowledge.models import RetrievedChunk

# Calibrated per SDD-02 §6.3/§6.4 — do not hand-tune without re-running the
# calibration script against `api/tests/fixtures/retrieval_cases.yaml`.
MIN_SCORE = settings.retrieval_min_score


def search(
    query: str,
    *,
    k: int = settings.retrieval_top_k,
    min_score: float = MIN_SCORE,
    section: str | None = None,
) -> list[RetrievedChunk]:
    """Semantic search over the knowledge index (SDD-02 §6.2).

    Returns an empty list when nothing clears `min_score` (DD-10) — a lack
    of match is a valid result, not something to paper over with a weak
    top-k, so callers must not assume a non-empty return.
    """
    index = get_knowledge_index()
    if not index.chunks:
        return []

    query_vector = np.asarray(embed_texts([query])[0], dtype=np.float32)
    norm = np.linalg.norm(query_vector)
    if norm > 0:
        query_vector = query_vector / norm

    scores = index.vectors @ query_vector  # both sides L2-normalized -> cosine similarity

    candidate_indices: list[int] = list(range(len(index.chunks)))
    if section is not None:
        candidate_indices = [i for i in candidate_indices if index.chunks[i].section == section]

    ranked = sorted(candidate_indices, key=lambda i: scores[i], reverse=True)[:k]

    results: list[RetrievedChunk] = []
    for i in ranked:
        score = float(scores[i])
        if score < min_score:
            continue
        chunk = index.chunks[i]
        results.append(
            RetrievedChunk(
                content=chunk.content,
                section=chunk.section,
                anchor=chunk.anchor,
                label=chunk.label,
                score=score,
            )
        )
    return results
