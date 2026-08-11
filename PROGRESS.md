# PROGRESS

## 완료된 것

- SDD-01 (Content Schema & Static Portfolio) 전체 구현
  - `web/src/types/content.ts` — Section/Case Study frontmatter 타입
  - `web/src/lib/content/` — anchors(§3.4/3.5 매핑 테이블), markdown 렌더러(unified/remark/rehype), 검증(zod + V-01~V-09), 로더
  - `web/scripts/validate-content.ts` + `pnpm validate:content`
  - 콘텐츠 파일 10개: `sections/{hero,about,what-i-build,how-i-work,skills,contact}.md`, `case-studies/{fingoo,sentinel-club,perix-sentinel,scpc-agent}.md`
  - 2컬럼 레이아웃(`PortfolioLayout`), `SectionNav`, `SectionContainer`, `HeroSection`, `CaseStudyList/Card`, `AgentSlotPlaceholder`
  - `app/page.tsx` 조립, `globals.css` `@theme` 역할 기반 토큰
  - CI: `.github/workflows/web.yml`에 `pnpm validate:content` 게이트 추가, SDD-00 §8.1 v0.2로 개정
- 검증: `pnpm validate:content` / `lint` / `typecheck` / `build` 모두 통과. 의도적 H2 누락 시 V-07 실패 확인. `next build` 결과 `/`가 `○ (Static)`로 완전 SSG 확인. 로컬 `pnpm start`로 전 앵커(`#experience-fingoo-architecture` 등) 렌더링 확인. Playwright로 desktop(1440×900, 2컬럼 + sticky Agent 슬롯)·mobile(390×844, 단일 컬럼, Agent 슬롯 미표시) 스크린샷 확인, 콘솔 에러 없음.

- SDD-02 (Knowledge Index Layer) 파이프라인 전체 구현
  - `web/scripts/build-knowledge-source.ts` + `pnpm build:knowledge-source` — SDD-01 로더 재사용, TS 단일 파서 유지(DD-06)
  - `api/app/knowledge/{models,embeddings,loader,search}.py` — `RetrievedChunk`, fail-fast 로더(L2 정규화 numpy), `search()`
  - `api/scripts/build_knowledge.py` — 증분 임베딩(DD-09) · `--force` · `--check` · `--dry-run`
  - `api/scripts/calibrate_retrieval.py` + `api/tests/fixtures/retrieval_cases.yaml` (15개 질의)
  - FastAPI `lifespan`에 인덱스 로딩 연결(`api/app/main.py`), fail-fast 3종 테스트(`test_knowledge_startup.py`)
  - CI 2단계 drift gate: Stage A(`web.yml` — `build:knowledge-source` + `git diff`), Stage B(`api.yml` — `build_knowledge.py --check`)
  - `api/.env.example` · `docs/conventions.md` §6.8 · SDD-00 §8.1/8.2/6.7 갱신(v0.3)
  - **실제 OpenAI(`text-embedding-3-small`) 임베딩으로 `api/data/knowledge.json` 생성 완료** (45 chunks, 1.27MB)
  - §6.4 캘리브레이션 확정: `k=4`, `min_score=0.30` (실측 gap: 관련 0.3282 / 무관 0.2629)
- 검증: `pnpm validate:content/lint/typecheck/build`, `uv run ruff/mypy/pytest`(15 tests) 전부 통과. Stage A/B 두 게이트 모두 clean 확인. 콘텐츠 수정 후 미갱신 상태에서 Stage A·B가 실제로 실패하는 것 직접 재현·확인. DD-10(무관 질의 3개 → 빈 배열), `--force` 전체 재생성, 서버 기동 로그("knowledge index loaded: 45 chunks") 모두 실측 확인. INV-01 회귀 없음(`web/src`에 backend fetch 없음).

- SDD-03 (Agent Backend & Trace Contract) 구현
  - `api/app/schemas/trace.py` — §5 전체 이벤트 Pydantic 모델(D-21), `api/app/schemas/chat.py` — `ChatRequest`/`PageContext`
  - `api/app/core/{redis_client,session,ratelimit,sse}.py` — 4계층 rate limit(fail closed, D-25), Redis 세션(D-26), SSE 포맷터
  - `api/app/knowledge/index_meta.py` — `page_context` 화이트리스트·`get_case_study` 조회용 section/case_study id 파생 (앵커 접미사가 closed heading-key set인지로 카드/H2 청크 구분 — SDD-01 DD-03 앵커 계약에 의존, 스키마에 별도 `case_study` 필드를 추가하지 않음)
  - `api/app/agent/{context,prompts,llm,tools,runner}.py` — 실행 루프(D-22), tool 5종 및 인자 검증(D-23), 시스템 프롬프트(D-27)
  - `api/app/api/v1/chat.py` — `POST /api/v1/chat` SSE 라우터(D-24), `RequestValidationError` 핸들러 추가(§6.6 봉투를 FastAPI 기본 422까지 일관되게)
  - `docs/contracts/trace-events.md`(D-28), `api/.env.example`·`docs/conventions.md`·SDD-00 §6.7 갱신(v0.5)
  - 테스트 62개: `test_trace_schema/test_index_meta/test_ratelimit/test_session/test_agent_tools/test_agent_context/test_chat_endpoint.py` (D-29) — SSE 이벤트 순서, rate limit 4계층, 세션 TTL/trim, tool별 검증(앵커 존재·case_study 존재), 예외 메시지 비유출, `page_context` 화이트리스트 반영, 무관 질의 시 `result_count: 0`, `generate_mvp_outline` → `answer.block` 전달, 시스템 프롬프트 미유출(구조적 회귀 가드), `trace.step.duration_ms` ≤ `total_latency_ms`
- 검증: `uv run ruff check/format --check/mypy app/pytest`(62 tests) 전부 통과, `build_knowledge.py --check` 영향 없음 확인. 실제 커밋된 `knowledge.json`(45 chunks)으로 서버 기동 후 `GET /api/v1/health` 200 확인. **Redis 미기동 상태에서 실제로 요청을 보내 fail-closed(503 UPSTREAM_UNAVAILABLE) 동작을 라이브로 재현·확인**(§7.3). `message: ""` 요청이 400 INVALID_REQUEST로 스트림 이전에 거부되는 것도 라이브로 확인.
  - **라이브 LLM 스모크 완료 (2026-08-11, 실제 `LLM_API_KEY`+`gpt-4o-mini`).** `app/agent/llm.py`/`runner.py`는 기존에 스크립트로 흉내낸 클라이언트로만 검증했었는데, 실제 OpenAI 스트리밍 응답(콘텐츠 델타·tool_call 델타 누적 모두)이 구현과 정확히 맞물려 코드 수정 없이 동작함을 확인했다. 확인한 것:
    - 포트폴리오 질문 → `retrieving_experience`에 실제 앵커(`experience-perix-sentinel`, score 0.61) 표시, 정상 답변(DoD 12.2)
    - 무관 질문(날씨) → `result_count: 0` + "I don't have information on that."(DD-10)
    - `page_context`(section/case_study) 반영 확인(DoD 12.2)
    - MVP 상담형 질문 → 모델이 자발적으로 **한 라운드에서 `generate_mvp_outline` + `search_portfolio` 2개 tool을 동시 호출** → `answer.block(mvp_outline)` 발행 → 다음 라운드에서 tool 없이 최종 답변 → `trace.meta: solution_consulting`(DD-16) 정상 도출(DoD 12.2) — `MAX_TOOL_CALLS_PER_ROUND`(라운드당 다중 tool) 경로가 실물 검증된 것도 이번이 처음
    - **시스템 프롬프트 유출 시도 3종 전부 거부**(DoD 12.4) — 직접 요청/역할극/가짜 승인 주장 3가지 모두 "I'm sorry, but I can't disclose that information" 류로 거절, 실제 시스템 프롬프트 문구는 SSE 출력 어디에도 없었음
    - 실소켓(uvicorn + `httpx.stream`, TestClient 아님)으로 `answer.delta`가 실제로 시간차를 두고 도착 — 진짜 토큰 스트리밍 확인(첫 토큰 ~1.9s, SDD-03 §10에 기입)
  - 확인 못한 것: 표본 1건 측정이라 first-token 지연 대표값은 아님, 여러 세션 동시 요청 시 지연 분포는 미측정.

- SDD-04 (Persistent Agent Panel & Page Context) 구현
  - `web/src/types/api.ts` 확장 — SDD-03 §5 이벤트 wire 타입 전체(snake_case, 백엔드 그대로 미러링)
  - `web/src/lib/agent/{types,sseClient,reducer,persistence}.ts` — 상태 모델(D-31, camelCase는 최상위 필드만·trace/suggestion/block/error는 페이로드 그대로), `fetch`+`ReadableStream` SSE 파서(D-32, C-01~C-08), 이벤트→상태 리듀서(D-33), `sessionStorage` 지속(D-37/DD-23)
  - `web/src/lib/page-context/{store,observer}.ts` — 단일 `IntersectionObserver`(D-34/DD-21), `useSyncExternalStore` 호환 스토어
  - `web/src/components/agent/{AgentProvider,AgentPanel,MessageList,MessageItem,Composer,ChatWarning,DegradedNotice,DebugTraceView}.tsx` (D-35/D-36) — `AgentSlotPlaceholder` 대체, U-01~U-07 반영
  - `SectionNav`를 client component로 전환해 `lib/page-context/store`를 직접 구독(D-39) — `components/agent`를 import하지 않음(SDD-00 §6.3)
  - `SectionContainer`/`CaseStudyList`/`CaseStudyCard`에 `data-agent-section`/`data-agent-case-study` 속성 추가 — observer가 SDD-01 콘텐츠 id를 하드코딩하지 않고 DOM에서 직접 읽도록
  - Vitest 도입(신규, 기존 프레임워크 없었음) — `web/src/lib/agent/{sseClient,reducer}.test.ts` 22개(D-40), `.github/workflows/web.yml`에 `pnpm test` 게이트 추가, SDD-00 §4.1/§4.5/§8.1 갱신(v0.6)
- 검증: `pnpm validate:content/lint/build/typecheck/test`(22 tests) 전부 통과, `/`는 여전히 `○ (Static)`. **실제 SDD-03 백엔드(fakeredis+실 OpenAI 키) + Playwright(Chromium)로 라이브 브라우저 검증**: 메시지 전송 → 실시간 스트리밍 답변 확인, Experience로 스크롤 시 nav `aria-current` 및 page context가 동시에 반응(D-39), Case Study 카드로 스크롤 시 `{section:"experience", case_study:"fingoo"}` 정확히 산출, 새로고침 후 대화 복원(DoD 9.3), 모바일 뷰포트(390×844)에서 Agent 슬롯 미표시(SDD-01과 동일), 콘솔 에러 0건.
  - **라이브 검증 중 실제 버그 1건 발견·수정**: `AgentProvider`가 `useState` 초기화 함수에서 `sessionStorage`를 동기로 읽어, 서버 렌더(빈 상태)와 클라이언트 최초 렌더(복원된 상태)가 달라 React hydration 에러가 발생했다. `useEffect`에서 마운트 후 1회 복원하도록 수정 — Next.js 공식 문서가 권장하는 표준 패턴. (`react-hooks/set-state-in-effect` 린트 규칙은 이 케이스에 대해 범위를 좁힌 `eslint-disable-next-line`으로 처리, 사유를 코드에 주석으로 남김.)

## 진행 중인 것

- 없음 (이번 세션 작업 자체는 완료. 단, 아래 "다음 단계"의 항목들은 미해결 상태로 남아있음)

## 다음 단계

- **[SDD-04 — 일부 DoD 미검증]** 라이브로 확인한 것 외에 아직 남은 항목:
  - Stop 버튼으로 스트림 중단 시 부분 텍스트 유지(DoD 9.1) — reducer 단위 테스트로는 확인했으나 실제 브라우저에서 Stop 클릭까지는 안 해봄
  - `RATE_LIMITED` 429 JSON 응답의 재시도 카운트다운 UI(DoD 9.4) — 코드는 있으나 실제로 rate limit을 유발해 눈으로 확인하지 않음
  - 스크롤 중 과도한 리렌더 없음(DoD 9.2, 프로파일러 확인) — React DevTools Profiler로 실측하지 않음
  - `sessionStorage` 저장 상한 초과 시 절삭(DoD 9.3) — 절삭 로직은 구현했으나 실제로 상한을 넘겨서 확인하지 않음
  - 서버가 새 `session_id` 발급 시 `contextReset` 안내(DoD 9.3) — Redis TTL(60분) 만료를 실제로 기다려 재현하지 않음
- **[SDD-02 §10.1 미충족, 이월]** Sentinel Club·Perix Sentinel·SCPC Agent 본문이 아직 "사실 검증 완료" 상태가 아닌 채로 실제 인덱싱(`knowledge.json`)까지 진행했다 — SDD-02가 스스로 "초안 상태 인덱싱 금지"라고 명시한 것과 배치된다. 사용자가 파이프라인 구축을 우선하기로 명시적으로 선택했기 때문이지만, **실제 서비스에 얹기 전에는 콘텐츠 사실 검증 후 `build:knowledge-source` + `build_knowledge.py` 재실행이 필요.**
- **`contact.md`의 LinkedIn·GitHub 링크가 여전히 `TODO` placeholder.** 이것도 인덱싱되어 있으므로(§10.1 두 번째 항목), 실제 링크로 교체 후 재인덱싱 필요.
- 검색 품질: 명확한 질의 8개 중 top-1 정확도 4/8 (top-4 포함 6/8) — 원인은 Case Study `Overview` 절이 다른 절 내용을 요약 언급해 구체 질의에서도 상위 랭크되는 콘텐츠 밀도 문제 (SDD-02 §6.4에 상세 기록). 콘텐츠 사실 검증 시 `Overview`를 더 개괄적으로 다듬으면 개선 여지 있음 — 이후 `calibrate_retrieval.py` 재실행 권장.
- SDD-02 O-12(검색 품질 회귀 테스트 CI 편입)는 아직 미착수 — 평가 셋이 임베딩 API 호출을 필요로 해 결정론적 CI에 부적합하다는 이유로 SDD 자체가 뒤로 미룸.
- SDD-01 DoD 중 사람이 직접 확인해야 하는 항목(브라우저 접근성 등)은 미검증 상태로 남아있음.

## 미결 결정사항

- `contact.md`의 nav order를 6으로 두고 `experience`는 frontmatter 없이 `page.tsx`에서 skills(5)와 contact(6) 사이에 하드코딩 삽입 — SDD-01 §3.1이 "experience는 sections/에 파일을 두지 않는다"고 명시한 것과 일치하는 설계 판단.
- Case Study 본문 HTML 렌더링에 Tailwind Typography 플러그인 대신 `globals.css`의 `.prose-content` 커스텀 규칙 사용 — 의존성 추가를 최소화하기 위한 선택, 추후 필요시 플러그인으로 교체 가능.
- SDD-02 §3.2 임베딩 헤더에서 Case Study **H2 청크에는 `keywords`(tech 배열)를 넣지 않기로 변경**했다(카드 청크에는 유지) — 모든 H2에 동일 tech 배열을 반복하면 같은 프로젝트의 청크들이 서로 지나치게 비슷해져 구체 질의의 top-1 정확도가 떨어지는 것을 실측으로 확인했기 때문. SDD-02 §6.4에 근거 기록.
- `search()`의 지식 인덱스는 모듈 전역 싱글턴(`set_knowledge_index`/`get_knowledge_index`)으로 구현 — SDD-02 §6.2가 보여준 `search(query, *, k, min_score, section)` 시그니처(별도 index 인자 없음)를 그대로 따르기 위한 선택. FastAPI `lifespan`에서 1회 로딩·주입.
- SDD-03 §10 `GLOBAL_DAILY_LIMIT`은 스펙에 구체적 기본값이 없어 `300`으로 직접 정했다(개인 IP 일 한도 200보다는 커야 여러 방문자를 감당) — 실제 운영 트래픽을 보고 조정이 필요한 값.
- SDD-03 §6 실행 흐름에서 rate limit(RATE_LIMITED)·요청 검증(INVALID_REQUEST) 실패는 **스트림이 열리기 전에 발생**하므로 일반 JSON 에러 응답(기존 `domain_error_handler`)으로 처리하고, `error` SSE 프레임은 스트림이 이미 열린 뒤의 실패(AGENT_FAILED 등)에만 사용하도록 구분했다 — SDD-03 §3.3이 두 경우를 명시적으로 구분하지 않아 내린 판단.
- `runner.py`의 tool 라운드 루프는 `stream=True + tools=...`를 매 라운드 동일하게 호출하고, 첫 델타가 `content`인지 `tool_calls`인지로 분기한다 — tool 미사용 턴에서 "결정 호출 1회 + 답변 생성 호출 1회"로 모델을 두 번 부르는 낭비를 없앤다. 대신 `generating_answer` trace step은 실제로 텍스트가 스트리밍된 구간에만 발행한다(INV-05 "연출용 가짜 단계 금지"를 지키기 위해, 텍스트가 이미 나온 뒤에 별도 단계를 다시 붙이지 않음).
- `get_case_study`/`page_context.case_study` 화이트리스트는 지식 인덱스 스키마에 필드를 추가하는 대신, 앵커 문자열(`experience-{id}` / `experience-{id}-{key}`)을 SDD-01 DD-03의 고정 heading-key 집합 기준으로 역파싱해서 도출한다 — SDD-02 커밋된 산출물 스키마를 건드리지 않기 위한 선택.
- SDD-04 `AgentError.code`를 백엔드 `ErrorCode`보다 넓게(`| "STREAM_INTERRUPTED"`) 정의했다 — 유휴 타임아웃(C-07)·비정상 종료(C-08)는 백엔드가 아예 모르는 클라이언트 전용 상황이라 대응하는 wire 코드가 없기 때문. `AgentError`의 나머지 필드는 §3.1 "그대로 미러링" 원칙을 그대로 따른다.
- `agentReducer`는 SDD-03 §3.2 표에 있는 SSE 이벤트 8종 + 클라이언트 전용 합성 이벤트 2종(`__network_error`: DD-22 degraded 진입, `__aborted`: C-06 Stop/언마운트)만 처리한다. "사용자 메시지 낙관적 추가"(전송 시 user+assistant 메시지를 배열에 미리 넣는 것)는 리듀서에 넣지 않고 `AgentProvider`가 직접 `setState`로 처리한다 — `agentReducer`를 §3.2 표와 정확히 1:1로 대응하는 순수 함수로 유지해 D-40 단위 테스트가 스펙 표를 그대로 검증할 수 있게 하기 위함.
- `AgentProvider`의 세션 복원(`sessionStorage` → state)은 `useState` 초기화 함수가 아니라 마운트 후 `useEffect`에서 수행한다 — SSR과 클라이언트 최초 렌더가 다른 값을 가지면 hydration 에러가 나기 때문(실제로 라이브 테스트 중 재현·수정, 위 참고). 첫 페인트는 항상 빈 상태이고, 복원된 대화는 마운트 직후 한 번 더 렌더링되며 나타난다(짧은 깜빡임 있음, 허용 가능한 트레이드오프로 판단).
- `data-agent-section`/`data-agent-case-study` 속성을 기존 `id`(앵커) 속성과 별도로 추가했다 — `id`는 스크롤 앵커/네비게이션 링크 타깃이라는 기존 역할을 그대로 유지하고, page-context 감지는 별도 속성으로 분리해 두 관심사가 서로의 값 형식(섹션은 id 그대로, Case Study는 앵커가 아니라 순수 id)에 얽매이지 않게 했다.
- `IntersectionObserver`의 `rootMargin`(`-10% 0px -70% 0px`)·`threshold` 값은 스펙에 구체적 수치가 없어 흔한 scroll-spy 패턴값으로 직접 정했다 — 실제 사용감을 보고 조정 여지가 있는 값.
- Case Study 중첩 판정(DD-21 "Case Study 활성 시 `{section: 'experience', case_study: id}`")은 "Case Study 요소가 하나라도 교차 중이면 무조건 우선, 없을 때만 섹션 레벨로 폴백"으로 구현했다 — Case Study `<article>`과 상위 `<section id="experience">`는 크기 차이가 커서 교차 비율을 직접 비교하는 게 무의미하다고 판단한 결과.
