import uuid
from typing import Literal

import redis.asyncio as redis
from pydantic import BaseModel
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.errors import UpstreamUnavailableError


class SessionTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class SessionSuggestionSummary(BaseModel):
    type: Literal["section", "contact"]
    label: str


class SessionRecord(BaseModel):
    session_id: str
    turns: list[SessionTurn] = []
    suggestions: list[SessionSuggestionSummary] = []


def new_session_id() -> str:
    return str(uuid.uuid4())


def _key(session_id: str) -> str:
    return f"session:{session_id}"


async def load_session(client: redis.Redis, session_id: str) -> tuple[SessionRecord, bool]:
    """Returns (record, resumed). A missing key is a fresh session, not an error."""
    try:
        raw = await client.get(_key(session_id))
    except RedisError as exc:
        raise UpstreamUnavailableError("Session store is temporarily unavailable.") from exc
    if raw is None:
        return SessionRecord(session_id=session_id), False
    return SessionRecord.model_validate_json(raw), True


async def save_session(client: redis.Redis, record: SessionRecord) -> None:
    # §8 — keep only the most recent SESSION_MAX_TURNS turns; no trace
    # events, tool payloads, or IPs are ever put on a SessionRecord.
    trimmed = record.model_copy(update={"turns": record.turns[-settings.session_max_turns :]})
    try:
        await client.set(
            _key(record.session_id),
            trimmed.model_dump_json(),
            ex=settings.session_ttl_seconds,
        )
    except RedisError as exc:
        raise UpstreamUnavailableError("Session store is temporarily unavailable.") from exc
