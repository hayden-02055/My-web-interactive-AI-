# SDD-00 — Foundation & Architecture

| | |
|---|---|
| **Document** | SDD-00 |
| **Title** | Foundation & Architecture |
| **Status** | Draft |
| **Version** | v0.3 |
| **Upstream** | Interactive AI Portfolio — PRD v0.1 |
| **Author** | 박해원 |
| **Phase** | 1단계 · 기반 |

---

## 1. Purpose

본 문서는 Interactive AI Portfolio의 **기술 기반과 전역 제약**을 확정한다.

SDD-00은 기능을 구현하지 않는다. 이후 모든 SDD가 참조할 **결정·불변식·컨벤션**을 고정하는 것이 유일한 목적이다.

### 1.1 In Scope

- 기술 스택 및 버전 정책
- 저장소 구조 및 배포 토폴로지
- 시스템 전역 불변식 (Invariants)
- 코드·API·커밋 컨벤션
- 환경변수 및 시크릿 정책
- CI 결정론적 게이트

### 1.2 Out of Scope

| 항목 | 이관 대상 |
|---|---|
| 콘텐츠 스키마 상세 | SDD-01 |
| 임베딩 청킹 전략 | SDD-02 |
| Trace 이벤트 필드 정의 | SDD-03 |
| LangChain 사용 여부 | SDD-03 |
| Page context 스냅샷 타이밍 | SDD-04 |
| Contact 전송 경로 | SDD-08 |

---

## 2. Architecture Decisions

각 결정은 `AD-XX`로 식별하며, 이후 SDD는 결정을 참조하되 재논의하지 않는다. 변경이 필요하면 본 문서를 개정한다.

### AD-01 · 2-Tier 분리 배포

```text
Browser
  │
  ├─→ Next.js (Vercel)        정적/SSG 포트폴리오, Agent UI
  │
  └─→ FastAPI (Railway)       Agent 실행, 지식 검색, SSE
                                 │
                                 └─→ Redis (Railway)
```

**근거**

PRD §3의 포지셔닝이 `Backend Engineering + AI Agent Engineering`이다. Next.js Route Handler 단일 구조로도 기능은 성립하지만, 백엔드 엔지니어를 표방하는 제품에 독립된 백엔드가 없으면 서사가 약해진다.

**기각안**

| 대안 | 기각 사유 |
|---|---|
| Next.js 단일 (Route Handler) | 포지셔닝 손실. Vercel 함수 스트리밍 제약 |
| NestJS 백엔드 | LLM 생태계 정합성 부족. 현 규모 대비 오버스펙 |

### AD-02 · 백엔드는 FastAPI (Python)

**근거**

- LLM SDK / tracing / evaluation 생태계가 Python 중심
- PRD §8.5에 이미 FastAPI 명시
- NestJS 역량은 Fingoo Case Study에서 별도 증명됨

### AD-03 · 지식베이스는 Build-time 임베딩 JSON

벡터 DB를 도입하지 않는다. 빌드 시점에 콘텐츠를 청킹·임베딩하여 `knowledge.json`에 벡터를 포함해 저장하고, API 기동 시 메모리에 상주시킨다. 검색은 in-memory 코사인 유사도로 수행한다.

**근거**

- 전체 콘텐츠 규모가 수천~1만 토큰대. pgvector 도입은 PRD §5.1 위반
- DB 인프라 0개 유지
- **그럼에도 검색은 실제 semantic retrieval이다.** X-ray가 표시하는 `Retrieved Context`가 실제 실행 결과와 일치해야 하므로(INV-06), 프롬프트 전체 주입 방식은 채택할 수 없다

**기각안**

| 대안 | 기각 사유 |
|---|---|
| 전체 콘텐츠 프롬프트 주입 | 검색이 존재하지 않음 → X-ray가 연출이 됨 |
| pgvector / 외부 벡터 DB | 데이터 규모 대비 과잉 |

### AD-04 · 통신은 SSE 직결

브라우저는 FastAPI에 직접 연결한다. Next.js를 경유하는 프록시를 두지 않는다.

**근거**

- X-ray(PRD §10)는 단계별 이벤트를 실시간 수신해야 성립한다
- 프록시 홉은 first-event latency를 악화시키고 Vercel 스트리밍 제약을 상속받는다

**대가**

CORS 설정과 백엔드 단독 rate limit이 필요하다 → AD-06에서 처리.

### AD-05 · 콘텐츠 단일 소스 (Markdown + Frontmatter)

포트폴리오 콘텐츠는 `web/src/content/**/*.md`에만 존재한다. UI 렌더링과 지식 인덱스 생성이 **동일 파일**을 소비한다.

**근거**

UI용 콘텐츠와 Agent 지식이 분리되면 반드시 drift가 발생한다. Agent가 사이트에 없는 내용을 말하거나, 사이트 갱신이 Agent에 반영되지 않는 상태는 제품의 신뢰(PRD §5.5)를 직접 훼손한다.

**형식 선택 근거**

TypeScript 모듈로 콘텐츠를 두면 Python 빌드 스크립트가 파싱할 수 없다. Markdown + YAML frontmatter는 양쪽 언어에서 동등하게 읽힌다.

### AD-06 · Redis 도입 — 1순위 명분은 Rate Limit

| 용도 | 우선순위 | 도입 SDD |
|---|---|---|
| Rate limiting | P0 | SDD-03 |
| 대화 세션 (TTL) | P0 | SDD-03 |
| 응답 캐시 | P1 | SDD-03 이후 |

**근거**

공개 웹에 LLM 엔드포인트를 노출하는 이상 남용 방어 없이는 비용이 통제되지 않는다. PRD §12는 이 항목이 비어 있으며, 본 SDD에서 보완한다.

세션만 놓고 보면 stateless(클라이언트가 히스토리 동봉)도 가능하지만, **rate limit은 서버 상태 없이 구현할 수 없다.** 따라서 Redis는 세션이 아니라 남용 방어를 명분으로 도입하고, 세션과 캐시를 그 위에 얹는다.

### AD-07 · 지식 인덱스는 커밋된 빌드 산출물

`knowledge.json`은 CI/로컬에서 생성하여 **저장소에 커밋**한다. 런타임에 생성하지 않는다.

**근거**

- Railway 배포 시점에 임베딩 API 호출이 발생하지 않는다 → 배포 실패 요인 제거
- Vercel 빌드 루트(`web/`)와 Railway 빌드 루트(`api/`)가 분리되어 있어, 크로스 디렉토리 참조를 배포 시점에 요구할 수 없다
- 콘텐츠 변경 시 인덱스 재생성 누락은 CI 게이트로 차단한다 (§8.3)

---

## 3. Invariants

전역 불변식이다. **모든 후속 SDD의 spec-conformance 리뷰에서 blocker로 취급한다.**

### INV-01 · Portfolio works without the Agent

포트폴리오 렌더링 경로는 백엔드에 blocking dependency를 가질 수 없다.

- 콘텐츠는 SSG로 빌드 시점에 확정된다
- API 장애 시 Agent 패널은 degraded 상태를 표시하되, 포트폴리오 탐색은 영향받지 않는다
- **검증**: 백엔드를 중단한 상태에서 전 섹션 탐색 및 Contact 도달이 가능해야 한다

> PRD §14 Reliability

### INV-02 · 결정론적 경로는 네트워크를 타지 않는다

다음 인터랙션은 클라이언트에서 종결되며 API를 호출하지 않는다.

- 섹션 감지 (IntersectionObserver)
- Navigation 제안 클릭 → 스크롤 이동
- Case Study 필터, 추천 질문 버튼
- X-ray 패널 확장/축소

`suggest_section()`은 `{ label, target }`만 반환하며, 실제 이동은 클라이언트가 처리한다.

**검증**: 제안 클릭 시 DevTools Network 요청 0회.

> PRD §11

### INV-03 · 콘텐츠 단일 소스

`web/src/content/` 외의 위치에 포트폴리오 콘텐츠 원본을 두지 않는다. 지식 인덱스는 반드시 이 디렉토리에서 파생된다.

### INV-04 · Navigation은 사용자 행동 이후에만

Agent는 어떤 경우에도 화면을 자동 이동시키지 않는다. 스크롤·라우팅은 사용자의 명시적 클릭 이후에만 실행된다.

> PRD §9.3 — Agent suggests. User decides.

### INV-05 · X-ray는 실제 실행을 반영한다

X-ray에 표시되는 모든 단계는 실제로 발생한 실행 이벤트여야 한다. 연출 목적의 가짜 단계, 고정 지연, 하드코딩된 문구를 넣지 않는다.

동시에 다음은 노출하지 않는다.

- System prompt
- Hidden reasoning
- Secret / API key
- 내부 보안 정책

> PRD §10.2

### INV-06 · 시크릿은 클라이언트에 존재하지 않는다

LLM API 키, 임베딩 키, Redis 자격증명은 백엔드에만 존재한다. `NEXT_PUBLIC_` 접두사가 붙은 변수에 시크릿을 담지 않는다.

### INV-07 · LLM 호출 엔드포인트는 rate limit 뒤에 있다

LLM 또는 임베딩 API를 호출하는 모든 엔드포인트는 예외 없이 rate limit을 통과해야 한다. 신규 엔드포인트 추가 시 기본값은 "제한 적용"이다.

> PRD §5.6, §12

---

## 4. Technology Stack

### 4.1 Frontend

| 항목 | 선택 |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| UI | React |
| Styling | Tailwind CSS |
| Package manager | pnpm |
| Deploy | Vercel |

### 4.2 Backend

| 항목 | 선택 |
|---|---|
| Framework | FastAPI |
| Language | Python 3.12 |
| Validation | Pydantic v2 |
| Server | Uvicorn |
| Package/venv | uv |
| Lint/Format | Ruff |
| Type check | mypy |
| Deploy | Railway |

### 4.3 Infrastructure

| 항목 | 선택 |
|---|---|
| Cache / Session | Redis (Railway add-on) |
| CI | GitHub Actions |
| VCS | GitHub (단일 저장소) |

### 4.4 Version Policy

- 모든 의존성은 lockfile로 고정한다 (`pnpm-lock.yaml`, `uv.lock`)
- 메이저 버전은 프로젝트 초기화 시점에 확정하고 본 문서 §4.5에 기록한다
- SDD 진행 중 임의 업그레이드를 금지한다. 변경이 필요하면 별도 `chore` 커밋으로 분리한다

### 4.5 Pinned Versions

> 초기화 시점에 실제 설치 버전을 기입한다. 미기입 상태에서 SDD-01로 진입하지 않는다.

| 패키지 | 버전 |
|---|---|
| next | 16.3.0 |
| react | 19.2.8 |
| typescript | 5.9.3 |
| tailwindcss | 4.3.3 |
| python | 3.12.13 |
| fastapi | 0.141.1 |
| pydantic | 2.13.4 |
| redis | _TBD_ — SDD-03에서 `redis` 의존성 추가 시점에 기입 (AD-06) |

---

## 5. Repository Structure

단일 저장소, 두 개의 독립 배포 단위.

```text
interactive-ai-portfolio/
├── README.md
├── .github/
│   └── workflows/
│       ├── web.yml
│       └── api.yml
│
├── docs/
│   ├── prd/
│   │   └── interactive-ai-portfolio-prd-v0.1.md
│   ├── sdd/
│   │   ├── SDD-00-foundation.md
│   │   ├── SDD-01-content-and-static-site.md
│   │   └── ...
│   └── conventions.md
│
├── web/                          # Vercel root directory
│   ├── src/
│   │   ├── app/                  # App Router
│   │   ├── components/
│   │   │   ├── portfolio/        # 좌측 콘텐츠
│   │   │   ├── agent/            # 우측 패널 · X-ray
│   │   │   └── ui/               # 공용 프리미티브
│   │   ├── content/              # ★ 콘텐츠 단일 소스 (INV-03)
│   │   │   ├── sections/
│   │   │   └── case-studies/
│   │   ├── lib/
│   │   └── types/
│   │       └── api.ts            # 백엔드 계약 미러
│   ├── .env.example
│   └── package.json
│
└── api/                          # Railway root directory
    ├── app/
    │   ├── main.py
    │   ├── api/
    │   │   └── v1/
    │   ├── agent/                # 실행 루프 · tools
    │   ├── knowledge/            # 인덱스 로딩 · 검색
    │   ├── core/                 # config · redis · ratelimit · errors
    │   └── schemas/              # Pydantic 모델
    ├── scripts/
    │   └── build_knowledge.py    # content/ → data/knowledge.json
    ├── data/
    │   └── knowledge.json        # 커밋된 빌드 산출물 (AD-07)
    ├── tests/
    ├── .env.example
    └── pyproject.toml
```

### 5.1 Deployment Root

| 플랫폼 | Root Directory | 빌드 |
|---|---|---|
| Vercel | `web/` | `pnpm build` |
| Railway | `api/` | `uv sync` + Uvicorn |

두 배포는 서로를 참조하지 않는다. 유일한 결합점은 `web`이 API Base URL을 환경변수로 아는 것뿐이다.

---

## 6. Conventions

> 본 장은 `docs/conventions.md`로도 복제하여, Claude Code가 SDD 없이도 참조 가능하게 유지한다.

### 6.1 Branch

```text
<type>/sdd-<번호>-<슬러그>

feat/sdd-01-static-portfolio
fix/sdd-03-sse-reconnect
chore/sdd-00-ci-pipeline
```

`type`은 §6.2와 동일한 집합을 사용한다.

### 6.2 Commit

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

### 6.3 Frontend (TypeScript / React)

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

### 6.4 Backend (Python / FastAPI)

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

### 6.5 API Convention

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

> 각 이벤트의 필드 스키마는 SDD-03에서 확정한다. 본 문서는 **이름 공간과 봉투 형태만** 고정한다.

### 6.6 Error Response

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

### 6.7 Environment Variables

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
```

> `EMBEDDING_*` · `KNOWLEDGE_INDEX_PATH` · `RETRIEVAL_*`는 SDD-02 §8에서 추가됐다.

`web/.env.example`

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**정책**

- `.env`는 커밋하지 않는다. `.env.example`만 커밋하며 키 추가 시 함께 갱신한다
- 시크릿은 Railway / Vercel 대시보드에서 관리한다
- `NEXT_PUBLIC_` 변수에 시크릿을 담지 않는다 (INV-06)

### 6.8 Documentation

- PRD·SDD는 `docs/` 하위에 커밋하며, 작성 시점부터 공유한다 (PRD §8.4)
- SDD 파일명: `SDD-<번호>-<슬러그>.md`
- 결정 변경 시 원문을 삭제하지 않고 개정 이력을 남긴다

---

## 7. CORS & Security Baseline

### 7.1 CORS

- 허용 오리진은 `ALLOWED_ORIGINS` 화이트리스트로만 지정한다. 와일드카드를 사용하지 않는다
- 허용 메서드는 실제 사용하는 것으로 한정한다

### 7.2 Rate Limit Baseline

SDD-03에서 구현하되, 기준값을 여기서 고정한다.

| 항목 | 기본값 | 키 |
|---|---|---|
| 분당 요청 | 10 | IP + 세션 |
| 일 요청 | 200 | IP |
| 요청당 입력 상한 | 문자 수 제한 적용 | — |

초과 시 §6.6의 `RATE_LIMITED`를 반환한다.

### 7.3 Chat Warning

Agent 입력 영역에 다음 안내를 상시 노출한다.

> Do not share passwords, API keys, private customer data, or other sensitive information with this AI Agent.

> PRD §12

---

## 8. CI — Deterministic Gates

LLM 판단이 아니라 **결정론적 게이트가 머지 조건**이다.

### 8.1 Web (`.github/workflows/web.yml`)

```text
pnpm install --frozen-lockfile
pnpm validate:content
pnpm build:knowledge-source
git diff --exit-code ../api/data/knowledge.source.json
pnpm lint
pnpm typecheck
pnpm build
```

> `validate:content`는 SDD-01 §4에서 정의하는 콘텐츠 스키마 검증 게이트다.
> `build:knowledge-source` + `git diff`는 §8.3 drift gate의 Stage A(SDD-02 §7.1)다.

### 8.2 API (`.github/workflows/api.yml`)

```text
uv sync --frozen
uv run python scripts/build_knowledge.py --check
ruff check
ruff format --check
mypy app
pytest
```

> `build_knowledge.py --check`는 §8.3 drift gate의 Stage B(SDD-02 §7.1)다.

### 8.3 Knowledge Index Drift Check

AD-07의 커밋된 산출물이 콘텐츠와 어긋나는 것을 차단한다.

```text
python scripts/build_knowledge.py --check
```

- 콘텐츠에서 인덱스를 재생성하여 커밋된 `knowledge.json`과 비교
- 임베딩 벡터를 제외한 **구조·청크 텍스트 해시**를 비교 대상으로 한다 (임베딩 호출 비용 회피)
- 불일치 시 CI 실패

> 상세 구현: SDD-02 §7 (2단계 검사 — Stage A는 §8.1, Stage B는 §8.2에 반영됨).

---

## 9. Definition of Done

SDD-00은 다음이 모두 참일 때 완료된다.

- [ ] GitHub 저장소 생성, §5 디렉토리 구조 반영
- [ ] `web` 초기화 완료, 로컬 빌드 성공
- [ ] `api` 초기화 완료, `GET /api/v1/health` 200 응답
- [ ] Vercel 배포 성공, 공개 URL 확인
- [ ] Railway 배포 성공, health check 공개 URL 확인
- [ ] Redis 애드온 프로비저닝, `REDIS_URL` 주입 확인
- [ ] 브라우저에서 Vercel → Railway health check 호출 성공 (CORS 검증)
- [ ] `.env.example` 양쪽 커밋
- [ ] CI 워크플로 2종 통과 (§8.3 제외 — SDD-02에서 추가)
- [ ] `docs/prd/`, `docs/sdd/`, `docs/conventions.md` 커밋
- [ ] §4.5 버전 표 실제 값으로 기입

---

## 10. Traceability

| PRD 요구 | SDD-00 대응 |
|---|---|
| §5.5 Trust over raw speed | §6.8 문서 저장소 커밋 |
| §5.6 Security by boundaries | INV-06, §7 |
| §12 Security & Privacy | §7.2, §7.3 |
| §14 Reliability | INV-01, §6.3 디렉토리 격리 |
| §9.3 Agent suggests, user decides | INV-04 |
| §10.2 X-ray 공개 범위 | INV-05 |
| §11 suggest_section 비이동 | INV-02 |

SDD-00은 FR을 직접 구현하지 않으며, FR-01 ~ FR-12는 SDD-01 이후에 매핑된다.

---

## 11. Open Items

| # | 항목 | 결정 시점 |
|---|---|---|
| O-01 | LangChain / LangGraph 사용 여부 | SDD-03 — trace 스키마 설계 후 판단 |
| O-02 | Page context 스냅샷 타이밍 | SDD-04 |
| O-03 | Contact 전송 경로 및 스팸 방어 | SDD-08 |
| O-04 | 응답 캐시 도입 여부 | SDD-03 이후 |
| O-05 | OpenAPI 기반 타입 생성 도입 | 계약 확대 시 재검토 |

---

## 12. Revision History

| 버전 | 일자 | 변경 |
|---|---|---|
| v0.1 | 2026-08-07 | 최초 작성 |
| v0.2 | 2026-08-11 | SDD-01 D-10 — §8.1에 `pnpm validate:content` 게이트 추가 |
| v0.3 | 2026-08-11 | SDD-02 D-19 — §8.3 drift gate 구현을 §8.1(Stage A)·§8.2(Stage B)에 반영 |
