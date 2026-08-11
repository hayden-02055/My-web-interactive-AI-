import fakeredis
import pytest

from app.core.config import settings
from app.core.session import SessionRecord, SessionTurn, load_session, new_session_id, save_session


@pytest.fixture
def redis_client() -> fakeredis.FakeAsyncRedis:
    return fakeredis.FakeAsyncRedis(decode_responses=True)


async def test_load_missing_session_returns_fresh_unresumed_record(
    redis_client: fakeredis.FakeAsyncRedis,
) -> None:
    session_id = new_session_id()
    record, resumed = await load_session(redis_client, session_id)
    assert resumed is False
    assert record.session_id == session_id
    assert record.turns == []


async def test_save_then_load_round_trips_turns(redis_client: fakeredis.FakeAsyncRedis) -> None:
    session_id = new_session_id()
    record = SessionRecord(
        session_id=session_id,
        turns=[
            SessionTurn(role="user", content="hi"),
            SessionTurn(role="assistant", content="hello"),
        ],
    )
    await save_session(redis_client, record)

    loaded, resumed = await load_session(redis_client, session_id)
    assert resumed is True
    assert [t.content for t in loaded.turns] == ["hi", "hello"]


async def test_save_trims_to_session_max_turns(
    redis_client: fakeredis.FakeAsyncRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "session_max_turns", 2)
    session_id = new_session_id()
    record = SessionRecord(
        session_id=session_id,
        turns=[SessionTurn(role="user", content=str(i)) for i in range(5)],
    )
    await save_session(redis_client, record)

    loaded, _ = await load_session(redis_client, session_id)
    assert [t.content for t in loaded.turns] == ["3", "4"]


async def test_save_sets_ttl(
    redis_client: fakeredis.FakeAsyncRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "session_ttl_seconds", 120)
    session_id = new_session_id()
    await save_session(redis_client, SessionRecord(session_id=session_id))

    ttl = await redis_client.ttl(f"session:{session_id}")
    assert 0 < ttl <= 120
