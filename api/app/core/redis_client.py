import redis.asyncio as redis

from app.core.config import settings

# Module-global singleton, same pattern as knowledge.loader's index and
# agent.llm's client — swapped out in tests via `set_redis_client`.
_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.redis_url, decode_responses=True)
    return _client


def set_redis_client(client: redis.Redis) -> None:
    global _client
    _client = client
