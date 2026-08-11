from typing import Literal

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

ErrorCode = Literal[
    "RATE_LIMITED",
    "INVALID_REQUEST",
    "AGENT_FAILED",
    "UPSTREAM_UNAVAILABLE",
    "INTERNAL_ERROR",
]


class DomainError(Exception):
    code: ErrorCode = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(self, message: str, *, retry_after: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.retry_after = retry_after


class RateLimitedError(DomainError):
    code: ErrorCode = "RATE_LIMITED"
    status_code = 429


class InvalidRequestError(DomainError):
    code: ErrorCode = "INVALID_REQUEST"
    status_code = 400


class AgentFailedError(DomainError):
    code: ErrorCode = "AGENT_FAILED"
    status_code = 502


class UpstreamUnavailableError(DomainError):
    code: ErrorCode = "UPSTREAM_UNAVAILABLE"
    status_code = 503


async def domain_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, DomainError)
    body: dict[str, object] = {"code": exc.code, "message": exc.message}
    if exc.retry_after is not None:
        body["retry_after"] = exc.retry_after
    return JSONResponse(status_code=exc.status_code, content={"error": body})


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Keeps FastAPI's built-in body-parsing failures (missing/malformed
    # fields) on the same §6.6 envelope as our own DomainError responses,
    # instead of leaking FastAPI's default 422 shape.
    assert isinstance(exc, RequestValidationError)
    return JSONResponse(
        status_code=400,
        content={"error": {"code": "INVALID_REQUEST", "message": "Invalid request body."}},
    )
