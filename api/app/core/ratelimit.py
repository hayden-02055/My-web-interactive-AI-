import redis.asyncio as redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.errors import RateLimitedError, UpstreamUnavailableError

_MINUTE = 60
_DAY = 86400


async def _incr_and_check(client: redis.Redis, key: str, window_seconds: int) -> int:
    pipe = client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds, nx=True)
    results = await pipe.execute()
    return int(results[0])


async def check_and_increment(client: redis.Redis, *, ip: str, session_id: str) -> None:
    """SDD-03 §7 — 4-tier check, run before any LLM/embedding call (INV-07).

    Fail closed (§7.3): a Redis error blocks the request rather than letting
    it through unmetered.
    """
    try:
        if (
            await _incr_and_check(client, f"rl:ip:min:{ip}", _MINUTE)
            > settings.rate_limit_per_minute
        ):
            raise RateLimitedError(
                "Too many requests. Please try again shortly.", retry_after=_MINUTE
            )

        if await _incr_and_check(client, f"rl:ip:day:{ip}", _DAY) > settings.rate_limit_per_day:
            raise RateLimitedError(
                "Daily request limit reached. Please try again tomorrow.", retry_after=_DAY
            )

        if (
            await _incr_and_check(client, f"rl:sess:min:{session_id}", _MINUTE)
            > settings.rate_limit_per_minute
        ):
            raise RateLimitedError(
                "Too many requests. Please try again shortly.", retry_after=_MINUTE
            )

        if await _incr_and_check(client, "rl:global:day", _DAY) > settings.global_daily_limit:
            raise UpstreamUnavailableError(
                "Daily service budget reached. Please try again tomorrow."
            )
    except RedisError as exc:
        raise UpstreamUnavailableError("Rate limiting is temporarily unavailable.") from exc
