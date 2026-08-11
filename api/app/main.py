from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.errors import DomainError, domain_error_handler

app = FastAPI(title="Interactive AI Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.add_exception_handler(DomainError, domain_error_handler)
app.include_router(v1_router)
