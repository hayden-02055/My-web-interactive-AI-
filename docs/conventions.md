# Conventions

> 본 문서는 [SDD-00 Foundation & Architecture](sdd/SDD-00-foundation.md) §6의 복제본이다. Claude Code가 SDD 없이도 참조 가능하게 유지한다. 원본과 불일치가 발생하면 SDD-00을 정본으로 한다.

## 6.1 Branch

```text
<type>/sdd-<번호>-<슬러그>

feat/sdd-01-static-portfolio
fix/sdd-03-sse-reconnect
chore/sdd-00-ci-pipeline
```

`type`은 §6.2와 동일한 집합을 사용한다.

## 6.2 Commit

```text
<type>(<scope>): <subject>

feat(web): add hero section with dual CTA
feat(api): implement sse chat endpoint
refactor(api): extract knowledge loader from startup hook
chore(infra): add github actions workflow for web
docs(sdd): add SDD-01 content schema
```

**type**

| type | 의미 |
|---|---|
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변경 없는 구조 개선 |
| `chore` | 빌드·설정·의존성 |
| `docs` | 문서 |
| `test` | 테스트 |
| `hotfix` | 운영 긴급 수정 |

**scope**

`web` · `api` · `content` · `infra` · `sdd`

**규칙**

- subject는 영문 소문자 명령형, 마침표 없음
- **1 SDD task = 1 commit = 1 review** 를 고정 단위로 한다
- 하나의 커밋이 두 개 이상의 SDD task를 포함할 수 없다

## 6.3 Frontend (TypeScript / React)

**파일명**

| 대상 | 규칙 | 예 |
|---|---|---|
| 컴포넌트 | PascalCase | `AgentPanel.tsx` |
| 훅 | camelCase, `use` 접두 | `useSectionObserver.ts` |
| 유틸 | camelCase | `formatLatency.ts` |
| 타입 정의 | camelCase | `api.ts` |
| 콘텐츠 | kebab-case | `fingoo.md` |

**코드**

- 컴포넌트는 named export를 기본으로 한다 (App Router 규약 파일 제외)
- `any` 금지. 불가피하면 `unknown` + 좁히기
- Props 타입은 `type`으로 선언하고 `<Component>Props`로 명명한다
- 서버 상태와 클라이언트 상태를 혼합하지 않는다
- Tailwind 클래스는 레이아웃 → 박스 → 타이포 → 색 → 상태 순으로 작성한다

**디렉토리 배치 원칙**

`components/portfolio`와 `components/agent`는 서로를 import하지 않는다. 공유가 필요하면 `components/ui` 또는 `lib`로 승격한다. INV-01을 구조로 강제하기 위함이다.

## 6.4 Backend (Python / FastAPI)

**파일·심볼명**

| 대상 | 규칙 |
|---|---|
| 모듈 / 파일 | snake_case |
| 클래스 | PascalCase |
| 함수 / 변수 | snake_case |
| 상수 | UPPER_SNAKE_CASE |
| Pydantic 모델 | PascalCase + 역할 접미 (`ChatRequest`, `TraceEvent`) |

**코드**

- 모든 public 함수에 타입 힌트를 붙인다. `mypy` 통과가 머지 조건이다
- 라우터는 I/O 조립만 담당한다. 도메인 로직은 `agent/` `knowledge/`에 둔다
- 설정값은 `core/config.py`의 Pydantic Settings 단일 지점에서만 읽는다. `os.getenv` 직접 호출 금지
- 예외는 `core/errors.py`의 도메인 예외로 발생시키고, 전역 핸들러가 §6.6 응답 형태로 변환한다

## 6.5 API Convention

**경로**

```text
/api/v1/<resource>
```

- 버전 접두 `v1` 고정
- 리소스는 복수형 명사, kebab-case

**Health check**

```text
GET /api/v1/health   →   200 { "status": "ok" }
```

INV-01 검증 및 배포 확인에 사용한다.

**Wire format**

- JSON body의 키는 **snake_case**로 통일한다 (백엔드 기준)
- 프론트는 `web/src/types/api.ts`에 동일 형태의 타입을 수기로 미러링한다
- MVP 규모에서 OpenAPI 코드 생성은 도입하지 않는다. 계약이 커지면 SDD-03 이후 재검토

**SSE 이벤트 명명**

```text
event: <domain>.<action>
data:  { ... }
```

| 이벤트 | 용도 |
|---|---|
| `trace.step` | X-ray 파이프라인 단계 |
| `answer.delta` | 답변 토큰 |
| `answer.done` | 답변 종료 |
| `suggestion` | Navigation / CTA 제안 |
| `error` | 실행 오류 |

> 각 이벤트의 필드 스키마는 [`docs/contracts/trace-events.md`](contracts/trace-events.md)(SDD-03 D-28)가 정본이다. 본 문서는 **이름 공간과 봉투 형태만** 고정한다.

## 6.6 Error Response

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again shortly.",
    "retry_after": 30
  }
}
```

- `code`는 UPPER_SNAKE_CASE, 클라이언트 분기용
- `message`는 사용자 노출 가능한 문장. 내부 스택·프롬프트·모델명을 포함하지 않는다
- 부가 필드는 선택적으로 추가한다

**초기 코드 집합**

`RATE_LIMITED` · `INVALID_REQUEST` · `AGENT_FAILED` · `UPSTREAM_UNAVAILABLE` · `INTERNAL_ERROR`

## 6.7 Environment Variables

**명명**

| 위치 | 규칙 |
|---|---|
| Backend | UPPER_SNAKE_CASE |
| Frontend 공개 | `NEXT_PUBLIC_` 접두 필수 |

**초기 집합**

`api/.env.example`

```bash
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000

LLM_API_KEY=
EMBEDDING_API_KEY=

EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
KNOWLEDGE_INDEX_PATH=data/knowledge.json
RETRIEVAL_TOP_K=4
RETRIEVAL_MIN_SCORE=0.3

REDIS_URL=redis://localhost:6379

RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_DAY=200
GLOBAL_DAILY_LIMIT=300

LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_MAX_OUTPUT_TOKENS=1024
LLM_TIMEOUT_SECONDS=25

MAX_MESSAGE_CHARS=1000
MAX_TOOL_ROUNDS=2
REQUEST_BUDGET_SECONDS=30

SESSION_TTL_SECONDS=3600
SESSION_MAX_TURNS=10
```

> `EMBEDDING_*` · `KNOWLEDGE_INDEX_PATH` · `RETRIEVAL_*`는 SDD-02 §8에서 추가됐다.
> `GLOBAL_DAILY_LIMIT` · `LLM_*` · `MAX_MESSAGE_CHARS` · `MAX_TOOL_ROUNDS` ·
> `REQUEST_BUDGET_SECONDS` · `SESSION_*`는 SDD-03 §10에서 추가됐다.

`web/.env.example`

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**정책**

- `.env`는 커밋하지 않는다. `.env.example`만 커밋하며 키 추가 시 함께 갱신한다
- 시크릿은 Railway / Vercel 대시보드에서 관리한다
- `NEXT_PUBLIC_` 변수에 시크릿을 담지 않는다 (INV-06)

## 6.8 Knowledge Index Workflow (SDD-02 §7.2)

콘텐츠(`web/src/content/`)를 수정한 뒤에는 다음 순서로 인덱스를 갱신하고, 산출물을 콘텐츠와 함께 커밋한다.

```bash
pnpm validate:content
pnpm build:knowledge-source
uv run python scripts/build_knowledge.py     # 변경분만 임베딩 (api/ 디렉토리에서 실행)
git add web/src/content api/data
```

- `build:knowledge-source`(TS)는 파싱과 청킹을 담당하고, `build_knowledge.py`(Python)는 임베딩만 담당한다 (DD-06) — Python이 Markdown을 직접 파싱하지 않는다
- `api/data/knowledge.source.json` · `api/data/knowledge.json`은 빌드 산출물이지만 **커밋한다** (AD-07) — 콘텐츠와 인덱스가 항상 같은 커밋에 있어야 CI drift gate(§7.1)가 성립한다
- 인덱스 갱신을 누락하면 CI에서 두 단계 중 하나가 실패한다: Stage A(`web.yml`)는 `knowledge.source.json`이 콘텐츠와 어긋났을 때, Stage B(`api.yml`)는 `knowledge.json`이 `knowledge.source.json`과 어긋났을 때

## 6.9 Documentation

- PRD·SDD는 `docs/` 하위에 커밋하며, 작성 시점부터 공유한다 (PRD §8.4)
- SDD 파일명: `SDD-<번호>-<슬러그>.md`
- 결정 변경 시 원문을 삭제하지 않고 개정 이력을 남긴다
