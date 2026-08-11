from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    llm_api_key: str = ""
    embedding_api_key: str = ""

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
