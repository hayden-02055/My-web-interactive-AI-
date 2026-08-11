# Interactive AI Portfolio

Interactive portfolio with an embedded AI agent that answers questions about the work
using real retrieval over the site's own content, with an X-ray panel showing each
pipeline step as it executes.

- [PRD](docs/prd/interactive-ai-portfolio-prd-v0.1.md)
- [SDD-00 — Foundation & Architecture](docs/sdd/SDD-00-foundation.md)
- [Conventions](docs/conventions.md)

## Structure

Single repository, two independently deployed units (see SDD-00 §5, §AD-01):

- `web/` — Next.js portfolio + Agent UI. Deploys to Vercel.
- `api/` — FastAPI agent execution, knowledge retrieval, SSE. Deploys to Railway.

## Local development

```bash
# web
cd web
pnpm install
cp .env.example .env.local
pnpm dev

# api
cd api
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

Health check: `GET http://localhost:8000/api/v1/health` → `{ "status": "ok" }`
