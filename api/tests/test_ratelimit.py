import fakeredis
import pytest
from redis.exceptions import ConnectionError as RedisConnectionError

from app.core.config import settings
from app.core.errors import RateLimitedError, UpstreamUnavailableError
from app.core.ratelimit import check_and_increment


@pytest.fixture
def redis_client() -> fakeredis.FakeAsyncRedis:
    return fakeredis.FakeAsyncRedis(decode_responses=True)


async def test_allows_requests_under_every_limit(
    redis_client: fakeredis.FakeAsyncRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_per_minute", 10)
    monkeypatch.setattr(settings, "rate_limit_per_day", 200)
    monkeypatch.setattr(settings, "global_daily_limit", 300)

    await check_and_increment(redis_client, ip="1.2.3.4", session_id="s1")


async def test_ip_per_minute_limit_raises_rate_limited(
    redis_client: fakeredis.FakeAsyncRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_per_minute", 2)
    monkeypatch.setattr(settings, "rate_limit_per_day", 200)
    monkeypatch.setattr(settings, "global_daily_limit", 300)

    await check_and_increment(redis_client, ip="1.2.3.4", session_id="s1")
    await check_and_increment(redis_client, ip="1.2.3.4", session_id="s2")
    with pytest.raises(RateLimitedError) as exc_info:
        await check_and_increment(redis_client, ip="1.2.3.4", session_id="s3")
    assert exc_info.value.retry_after == 60


async def test_session_per_minute_limit_is_independent_of_ip(
    redis_client: fakeredis.FakeAsyncRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_per_minute", 1)
    monkeypatch.setattr(settings, "rate_limit_per_day", 200)
    monkeypatch.setattr(settings, "global_daily_limit", 300)

    await check_and_increment(redis_client, ip="1.1.1.1", session_id="same-session")
    with pytest.raises(RateLimitedError):
        await check_and_increment(redis_client, ip="2.2.2.2", session_id="same-session")


async def test_global_daily_limit_raises_upstream_unavailable(
    redis_client: fakeredis.FakeAsyncRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_per_minute", 100)
    monkeypatch.setattr(settings, "rate_limit_per_day", 1000)
    monkeypatch.setattr(settings, "global_daily_limit", 1)

    await check_and_increment(redis_client, ip="1.1.1.1", session_id="s1")
    with pytest.raises(UpstreamUnavailableError):
        await check_and_increment(redis_client, ip="2.2.2.2", session_id="s2")


class _BrokenRedis:
    def pipeline(self) -> "_BrokenRedis":
        return self

    def incr(self, *_args: object, **_kwargs: object) -> None:
        return None

    def expire(self, *_args: object, **_kwargs: object) -> None:
        return None

    async def execute(self) -> list[int]:
        raise RedisConnectionError("connection refused")


async def test_redis_failure_fails_closed() -> None:
    with pytest.raises(UpstreamUnavailableError):
        await check_and_increment(_BrokenRedis(), ip="1.1.1.1", session_id="s1")  # type: ignore[arg-type]
