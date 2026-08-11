import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.core.errors import DomainError, domain_error_handler
from app.knowledge.loader import load_knowledge_index, set_knowledge_index

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # SDD-02 §6.1 — fail fast: an unloadable/stale index must stop startup,
    # not silently serve wrong-vector-space search results.
    index = load_knowledge_index()
    set_knowledge_index(index)
    logger.info("knowledge index loaded: %d chunks", len(index.chunks))
    yield


app = FastAPI(title="Interactive AI Portfolio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.add_exception_handler(DomainError, domain_error_handler)
app.include_router(v1_router)
