from openai import AsyncOpenAI

from app.core.config import settings

# Module-global singleton (same pattern as knowledge.loader/redis_client),
# swapped for a fake in tests via `set_llm_client`. DD-13: this is the one
# file that knows the model provider is OpenAI's chat.completions API —
# swapping providers means editing this file and runner.py's call sites,
# not the trace schema or the router.
_client: AsyncOpenAI | None = None


def get_llm_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.llm_api_key, timeout=settings.llm_timeout_seconds)
    return _client


def set_llm_client(client: AsyncOpenAI) -> None:
    global _client
    _client = client
