from pydantic import BaseModel


class RetrievedChunk(BaseModel):
    """SDD-02 §6.2 — the contract SDD-03's Agent tool consumes.

    {content, section, anchor} satisfies PRD §9.2; `label` (SDD-01 §3.6) and
    `score` (INV-05, X-ray) are additions on top of that minimum. Changing
    this shape requires a companion change in SDD-03.
    """

    content: str
    section: str
    anchor: str
    label: str
    score: float
