from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    llm_api_key: str = ""
    embedding_api_key: str = ""

    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    knowledge_index_path: str = "data/knowledge.json"
    retrieval_top_k: int = 4
    retrieval_min_score: float = 0.3

    redis_url: str = "redis://localhost:6379"

    rate_limit_per_minute: int = 10
    rate_limit_per_day: int = 200

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
