# Interactive AI Portfolio

Interactive portfolio with an embedded AI agent that answers questions about the work
using real retrieval over the site's own content, with an X-ray panel showing each
pipeline step as it executes.

- [PRD](docs/prd/interactive-ai-portfolio-prd-v0.1.md)
- [SDD-00 — Foundation & Architecture](docs/sdd/SDD-00-foundation.md)
- [SDD-01 — Content Schema & Static Site](docs/sdd/SDD-01-content-and-static-site.md)
- [SDD-02 — Knowledge Index](docs/sdd/SDD-02-knowledge-index.md)
- [SDD-03 — Agent Backend & Trace Contract](docs/sdd/SDD-03-agent-backend-and-trace.md)
- [SDD-04 — Agent Panel & Page Context](docs/sdd/SDD-04-agent-panel-and-page-context.md)
- [SDD-05/06/07 — Agent Experience Layer](docs/sdd/SDD-05-06-07-agent-experience-layer.md)
- [SDD-08 — MVP Closure](docs/sdd/SDD-08-mvp-closure.md)
- [Trace event contract](docs/contracts/trace-events.md)
- [Conventions](docs/conventions.md)
- [Progress log](PROGRESS.md)

## Structure

Single repository, two independently deployed units (see SDD-00 §5, §AD-01):

- `web/` — Next.js portfolio + Agent UI. Deploys to Vercel.
- `api/` — FastAPI agent execution, knowledge retrieval, SSE. Deploys to Railway.

## Local development

**Prerequisite: Redis.** `POST /api/v1/chat` fails closed (`503 UPSTREAM_UNAVAILABLE`) without
it — rate limiting is checked before any LLM call, on purpose (SDD-03 §7.3). `/api/v1/health`
works fine without Redis, so a green health check alone doesn't mean chat will work.

```bash
# pick one
docker run -d --name portfolio-redis -p 6379:6379 redis:7-alpine
# or: brew install redis && brew services start redis

redis-cli ping   # -> PONG
```

```bash
# api
cd api
uv sync
cp .env.example .env
# then edit .env: set LLM_API_KEY and EMBEDDING_API_KEY (both OpenAI — the
# same key works for both) or chat will fail once it reaches the model call
uv run uvicorn app.main:app --reload

# web (separate terminal)
cd web
pnpm install
cp .env.example .env.local
pnpm dev
```

`web/.env.example` → `.env.local` sets `NEXT_PUBLIC_API_BASE_URL` for the browser to find the
API. Skipping this step doesn't error visibly — the frontend just calls its own origin instead
of the backend, and chat silently fails.

Health check: `GET http://localhost:8000/api/v1/health` → `{ "status": "ok" }`
Full smoke test: open `http://localhost:3000`, ask the Agent something — a real answer with
`answer.done` confirms Redis, the LLM key, and the frontend↔backend wiring are all correct.

## Testing

```bash
# web — unit tests (Vitest, lib/agent + lib/page-context only)
cd web && pnpm test

# web — E2E (Playwright; builds + serves the app itself, see playwright.config.ts)
cd web && pnpm test:e2e

# api
cd api && uv run ruff check . && uv run mypy app && uv run pytest
```
