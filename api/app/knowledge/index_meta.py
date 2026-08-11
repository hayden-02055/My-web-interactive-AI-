from app.knowledge.loader import KnowledgeChunkMeta, get_knowledge_index

# Case Study chunk anchors follow `experience-{id}` (card) and
# `experience-{id}-{key}` (H2 section), a fixed contract shared with the TS
# anchor table (SDD-01 DD-03, `web/src/lib/content/anchors.ts`). The chunk
# schema itself has no separate `case_study` field, so this closed key set
# is what lets us split the id back out of the anchor unambiguously.
_HEADING_KEYS = {
    "overview",
    "problem",
    "role",
    "constraints",
    "solution",
    "architecture",
    "decisions",
    "result",
    "learned",
}

_EXPERIENCE_SECTION = "experience"


def section_ids() -> set[str]:
    """Section IDs that actually exist in the knowledge index (SDD-03 §3.2)."""
    return {chunk.section for chunk in get_knowledge_index().chunks}


def case_study_ids() -> set[str]:
    ids: set[str] = set()
    for chunk in get_knowledge_index().chunks:
        if chunk.section != _EXPERIENCE_SECTION:
            continue
        rest = chunk.anchor.removeprefix(f"{_EXPERIENCE_SECTION}-")
        prefix, _, suffix = rest.rpartition("-")
        ids.add(prefix if prefix and suffix in _HEADING_KEYS else rest)
    return ids


def case_study_chunks(case_study_id: str) -> list[KnowledgeChunkMeta]:
    """All chunks (card + H2 sections) belonging to one Case Study."""
    card_anchor = f"{_EXPERIENCE_SECTION}-{case_study_id}"
    h2_prefix = f"{card_anchor}-"
    return [
        chunk
        for chunk in get_knowledge_index().chunks
        if chunk.section == _EXPERIENCE_SECTION
        and (chunk.anchor == card_anchor or chunk.anchor.startswith(h2_prefix))
    ]


def anchor_exists(anchor: str) -> bool:
    return any(chunk.anchor == anchor for chunk in get_knowledge_index().chunks)
