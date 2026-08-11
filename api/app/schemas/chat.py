from pydantic import BaseModel, Field

from app.core.config import settings


class PageContext(BaseModel):
    """Client-supplied, untrusted (SDD-03 §9.1) — validated against the

    knowledge index whitelist in `app.agent.context.resolve_page_context`
    before use. Unregistered values are ignored, not rejected (§3.2).
    """

    section: str | None = None
    case_study: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=settings.max_message_chars)
    session_id: str | None = None
    page_context: PageContext | None = None
