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

- SDD-05·06·07 (Agent Experience Layer — Navigation Suggestion · X-ray · Solution Consulting) 구현
  - `web/src/lib/agent/navigate.ts` — 앵커 스크롤·강조·포커스 이동 공용 로직(DD-26/27/28), `SuggestionCard`·`XrayDetail`·`MvpOutlineBlock`이 전부 공유
  - `globals.css`에 `.agent-highlight` 애니메이션 추가 — 기존 `--accent` 토큰만 사용(§4.3), `prefers-reduced-motion` 대응
  - `web/src/components/agent/SuggestionCard.tsx` (D-41/42/43) — section/contact 분기, 마운트 시 앵커 존재 여부를 미리 확인해 비활성 표시(클릭 실패를 기다리지 않음)
  - `web/src/components/agent/{XrayPipeline,XrayDetail}.tsx` (D-45~48) — 5개 고정 슬롯(DD-29), stage별 허용 필드만 렌더링하는 화이트리스트(DD-30), 스트리밍 중 펼침·완료 후 접힘·첫 메시지는 한 번 펼친 채 유지(DD-31)
  - `web/src/components/agent/MvpOutlineBlock.tsx` (D-49/50) — 구조화 렌더링, `relevant_case_studies`는 `SuggestionCard` 재사용(DD-33), `caveats` 비어있을 때 기본 문구
  - `web/src/components/agent/StarterPrompts.tsx` (D-44) — 정적 상수 4개, 클릭 시 입력창만 채움(전송 안 함)
  - `AgentProvider`에 `composerValue`/`setComposerValue`를 끌어올려 `StarterPrompts`(형제 컴포넌트)가 `Composer`의 입력을 채울 수 있게 함 — Composer 로컬 state였던 것을 context로 이동
  - `MessageItem.tsx` 재작성(D-52) — X-ray → 답변 텍스트 → MVP 블록 → 제안 카드 순서(§4.1), 임시 `DebugTraceView` 제거(실제 UI로 대체됨, SDD-04 §6.3가 의도한 대로)
  - `web/src/lib/agent/fixtures.ts` — F-01~F-06 목 픽스처(D-51, `AgentSseEvent[]` 그대로), `fixtures.test.ts` 6개로 리듀서 결과 검증
- 검증: `pnpm validate:content/lint/build/typecheck/test`(28 tests) 전부 통과. **6개 픽스처 전부를 실제 브라우저(Playwright)에서 `page.route()`로 `/api/v1/chat` 네트워크 응답을 가로채 렌더링 검증** — 실 백엔드가 구조적으로 만들 수 없는 상태(F-05 스트리밍 중단, F-06 존재하지 않는 앵커)까지 포함해 전부 재현·확인:
  - F-01: 제안 카드 클릭 → 이동 성공, **클릭 시 네트워크 요청 0회**(DevTools 요청 카운트로 확인, INV-02), 포커스가 실제로 대상 요소로 이동(`document.activeElement.id` 확인), `prefers-reduced-motion: reduce` 에뮬레이션 상태에서도 포커스 이동 동일하게 동작
  - F-02: 검색 0건이 X-ray Technical Detail에 "no results above the relevance threshold"로 명시 표시
  - F-03: MVP outline 블록 렌더, Case Study 2건이 클릭 가능한 카드로, 기본 caveat 문구, 별도의 `suggest_contact` 제안이 블록 아래 독립적으로 표시(블록이 CTA를 내장하지 않음, DD-34 확인)
  - F-04: tool 미사용 인사말 — `selecting_action`이 `skipped`로 표시, 제안·블록 없음
  - F-05: 스트리밍 중 `error` 이벤트로 종료 — 이미 도착한 부분 텍스트가 사라지지 않고 유지됨을 확인
  - F-06: 존재하지 않는 앵커 제안 — 카드가 클릭도 하기 전에 마운트 시점부터 이미 비활성 상태로 렌더(사용자가 실패를 겪지 않고 미리 안다)
  - 2턴 연속 전송으로 X-ray 펼침 정책 확인: 첫 메시지는 완료 후에도 "Process"(펼침) 유지, 두 번째 메시지는 완료 후 "N steps · Nms"(한 줄 요약)로 자동 접힘 — DD-31 그대로 재현
  - 실 백엔드(fakeredis+실 OpenAI 키)로도 스모크: 시작 프롬프트 클릭(전송 안 됨) → 직접 전송 → 정상 응답. 다만 실 모델이 "Fingoo 관련 링크 알려줘" 류 질문에서 `suggest_section` tool 대신 답변 텍스트에 마크다운 링크(`[text](url)`)를 그대로 적어 넣는 경우를 발견 — 렌더러는 이를 plain text로만 표시(의도된 안전한 동작, `dangerouslySetInnerHTML` 미사용)하지만 모델이 tool 대신 텍스트 링크를 선호하는 경향은 SDD-03 시스템 프롬프트 튜닝 여지로 남음(아래 "다음 단계"에 기록)
  - 콘솔 에러 0건(모든 시나리오 공통), 모바일 뷰포트 회귀 없음(Agent 슬롯 여전히 미표시)
  - 확인 못한 것: X-ray `failed` 상태의 실제 렌더(아이콘 로직은 코드리뷰로 검증했으나 `failed` status를 가진 트레이스 스텝을 실제로 주입해보지 않음), X-ray Technical Detail 내부 검색 결과 앵커 클릭(같은 `navigateToAnchor` 공용 함수를 쓰므로 SuggestionCard 클릭 검증으로 갈음 판단) — **SDD-08에서 둘 다 해소됨, 아래 참고**

- SDD-08 (MVP Closure — Mobile Shell · Isolation · Accessibility) 구현
  - `web/src/components/agent/mobile/{AgentFab,AgentOverlay}.tsx` (D-53) — FAB→전체화면 오버레이(DD-35), `AgentProvider`를 언마운트하지 않고 표시만 전환(DD-36)
  - `web/src/lib/page-context/observer.ts` 수정(DD-37) — 아무것도 교차하지 않을 때 `null`을 발행하지 않고 마지막 유효값 유지(관측 대상이 안 보인다고 컨텍스트를 지우면 안 됨)
  - 접근성: `web/src/app/layout.tsx`에 skip link(A-06), `PortfolioLayout`의 `<main>`에 `id="main-content"`, 오버레이 포커스 트랩·ESC·포커스 복귀(A-02, D-56)
  - `web/playwright.config.ts` + `web/e2e/inv01-portfolio-without-agent.spec.ts` — Playwright E2E 신규 도입(DD-39), `NEXT_PUBLIC_API_BASE_URL`을 RFC 2606 `.invalid` 도메인으로 빌드해 진짜 도달 불가 상태로 INV-01 검증. CI에 `e2e` job 추가
  - `web/scripts/check-bundle-secrets.ts` (D-59, INV-06) — `.next/static`만 스캔(서버 전용 코드 제외), API 키 패턴 + 서버 전용 env var 이름 검색. CI `ci` job에 편입
  - `api/app/agent/prompts.py` 개정(C-05) — `suggest_section` tool을 직접 호출하고 답변 본문에 내부 링크를 쓰지 말라는 지시 추가
  - `api/app/api/v1/chat.py` 수정(C-07) — 클라이언트가 보낸 `session_id`가 Redis에 없으면(TTL 만료 등) 같은 id를 재사용하지 않고 새 id 발급, 회귀 테스트 추가
  - `web/src/components/agent/AgentProvider.tsx` 수정(C-08) — 세션 복원 완료 플래그를 ref에서 state로 교체(레이스 컨디션 수정, 아래 버그 항목 참고)
  - `README.md` 갱신 — SDD-01~08·트레이스 계약 링크, 테스트 명령 섹션 추가
- 검증: `pnpm validate:content/lint/build/typecheck/test`(28 tests) + `pnpm test:e2e`(2 tests) + `pnpm check:bundle-secrets`, `uv run ruff/mypy/pytest`(63 tests) 전부 통과. Lighthouse 프로덕션 빌드 실측(로컬): Performance 100(데스크톱)/98(모바일), Accessibility 100(공통), FCP 0.9s/LCP 2.5s(모바일), TBT 0ms, CLS 0.
  - **DD-39 요구대로 INV-01 E2E 테스트를 의도적으로 깨뜨려 실패하는 것 확인 후 원복** — `SectionContainer`의 `id`를 임시로 훼손해 테스트 2개가 정확히 실패하는 것 재현.
  - **INV-06 스캐너를 의도적으로 검증** — 합성 시크릿 문자열을 빌드 산출물에 주입해 탐지되는 것 확인 후 제거, 정상 빌드는 clean.
  - Playwright로 모바일 뷰포트(390×844) 라이브 검증: FAB 탭→오버레이 열림→포커스가 닫기 버튼으로 이동(A-02), Case Study로 스크롤 후 오버레이를 열고 질문 전송 시 **오버레이가 열려 있어도 스크롤 전 page_context(`{section:"experience", case_study:"fingoo"}`)가 그대로 전송됨**(DD-37 핵심 시나리오), 배경 스크롤 잠금/해제, ESC로 닫힘 + 포커스가 FAB로 정확히 복귀, Tab 트랩이 마지막 요소에서 첫 요소로(및 역방향) 순환, 스트리밍 중 닫아도 백그라운드에서 계속 진행되고 재열기 시 이어짐(M-07), 데스크톱 뷰포트에서 FAB 완전 미노출.
  - 접근성 라이브 검증: 첫 15개 tab stop 전수 확인 결과 전부 포커스 표시(outline) 보임, skip link가 실제 첫 tab stop, 콘텐츠에 이미지가 없어 alt 텍스트 이슈 자체가 없음, 헤딩 레벨(H1→H2→H3→H4) 스킵 없음.
  - C-06~C-11 카테고리 전항 라이브 확인 완료 (429 카운트다운, Stop 버튼(실제 열린 스트림으로 재현), 스크롤 리렌더(41스텝 중 nav DOM 변경 5회로 유계), X-ray `failed` 상태 렌더).
  - **라이브 검증 중 실제 버그 2건 발견·수정**:
    1. **백엔드**: 클라이언트가 만료된 `session_id`를 보내면 서버가 같은 id로 빈 세션을 재발급해, 클라이언트가 "컨텍스트 리셋"을 영원히 감지할 수 없었다(id가 안 바뀌므로). `session_id`를 신규 발급하도록 수정.
    2. **프론트엔드**: `AgentProvider`의 세션 복원 완료 플래그가 `useRef`였는데, ref는 동기로 즉시 바뀌지만 짝을 이루는 `setState`는 다음 렌더까지 반영되지 않아 — 마운트 시 "복원 완료 플래그는 true, 그런데 state는 아직 복원 전 빈 배열"인 순간에 저장 이펙트가 끼어들어 **방금 sessionStorage에서 읽어온 대화를 빈 배열로 덮어써버렸다.** 60개 메시지를 시딩한 뒤 새로고침하는 테스트로 재현(저장 결과가 0개로 나와 발견), 플래그를 `useState`로 바꿔 두 값이 항상 같은 렌더에서 갱신되도록 수정 후 정확히 50개(`MAX_MESSAGES`)로 절삭되는 것 확인.
  - 확인 못한 것 / 배포 인프라 필요: 실기기 가상 키보드 겹침(M-06, 스펙 자체가 에뮬레이터로 재현 불가 명시), Railway/Vercel 환경변수 설정과 프로덕션 URL SSE 동작(L-03/L-05/L-06, 배포 권한 없음), 실기기 iOS/Android 확인(L-08).

## 진행 중인 것

- 없음 (이번 세션 작업 자체는 완료. 단, 아래 "다음 단계"의 항목들은 미해결 상태로 남아있음)

## 다음 단계

- **[출시 전 배포 작업 필요, 에이전트가 수행 불가]** Railway·Vercel 환경변수 설정(`.env.example` 대조), 프로덕션 도메인을 `ALLOWED_ORIGINS`에 추가, 프로덕션 URL에서 SSE 실동작 확인, 실기기(iOS·Android) 모바일 확인 — SDD-08 §6 L-03/L-05/L-06/L-08.
- **[SDD-03 프롬프트 튜닝, 부분 해결]** 시스템 프롬프트를 고쳐 마크다운 링크·tool 이름 노출은 사라졌지만, 모델이 여전히 `suggest_section`을 호출하지 않고 말로만 안내하는 경우가 남아있다(gpt-4o-mini의 한계로 추정). 더 강한 모델 또는 few-shot 예시 추가가 다음 시도 후보 — Post-MVP.
- 검색 품질: 명확한 질의 8개 중 top-1 정확도 4/8 (top-4 포함 6/8) — 콘텐츠 본문이 이번에도 바뀌지 않아 SDD-02 §6.4 수치가 그대로 유효하다(SDD-08 §7에 재확인 기록). 원인은 Case Study `Overview` 절의 콘텐츠 밀도 문제, 실제로 본문을 고쳐 개선하려면 `calibrate_retrieval.py` 재실행 필요.
- SDD-02 O-12(검색 품질 회귀 테스트 CI 편입)는 아직 미착수 — 평가 셋이 임베딩 API 호출을 필요로 해 결정론적 CI에 부적합하다는 이유로 SDD 자체가 뒤로 미룸.
- Post-MVP 후보(SDD-08 §11에 기록): Analytics, Technical X-ray Detail 사용 관찰 후 개선, 대화→Contact 요약, Case Study 필터링, Contact 폼 백엔드, 쿼리 임베딩/응답 캐시, 스크린리더 전면 최적화, 다국어.

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
- SDD-05 `SuggestionCard`의 앵커 존재 확인(DD-27)은 클릭 실패를 기다리지 않고 **마운트 시점에 미리** 확인한다 — 정적 포트폴리오 콘텐츠는 조건부 렌더링이 없어 마운트 시점에 이미 최종 DOM 상태이므로, 클릭 전에 비활성 표시를 보여줄 수 있고 그게 더 정직하다고 판단했다.
- X-ray 슬롯(DD-29)이 같은 stage에 대해 여러 `trace.step`을 받을 수 있는 경우(tool 라운드 2회 이상 시 `selecting_action`이 반복 발행됨)를 대비해, 한 슬롯 안에 여러 행을 쌓아 보여주도록 구현했다 — SDD-03 §5.2의 `id` 규칙("같은 stage가 반복되면 `tool_call:2` 등으로 구분")과 일치하며, `agentReducer`가 이미 `id` 기준으로 각 트레이스를 구분해 배열에 유지하므로 자연스럽게 맞아떨어졌다.
- X-ray 상태 아이콘은 색상이 아니라 글리프(✓/✕/●/○)로 구분했다 — 이 프로젝트의 `@theme` 토큰(§4.3)에 "실패/위험"을 나타낼 색이 없어서, 색만으로 상태를 구분하면 접근성도 떨어지고 없는 색을 새로 만드는 셈이 되기 때문.
- X-ray "첫 메시지" 판정(DD-31 "첫 방문 시 한 번은 자동으로 펼쳐진 채로 둔다")은 **현재 세션의 대화 배열에서 가장 오래된 assistant 메시지인지**로 판정한다 — 별도 저장소 없이 계산 가능하고, `sessionStorage` 복원(DD-23)과도 자연히 일치한다(복원된 대화의 첫 메시지도 동일하게 "첫 메시지"로 취급됨).
- `MvpOutlineBlock`이 `relevant_case_studies`의 id만 갖고 있어 실제 Case Study 제목을 모르는 문제는, 없는 데이터를 지어내는 대신 id를 `humanizeId()`로 포맷팅(`"perix-sentinel"` → `"Perix Sentinel"`)해서 표시하는 것으로 해결했다 — 서버 콘텐츠 메타데이터를 클라이언트로 새로 흘려보내는 배선을 추가하지 않기 위한 선택.
- `Composer`의 입력값(`composerValue`)을 로컬 state에서 `AgentProvider` context로 끌어올렸다 — `StarterPrompts`가 형제 컴포넌트인 `Composer`의 입력창을 채워야 하는데(§1.5), React에서 형제 간 상태 공유는 공통 부모로 끌어올리는 것이 정공법이라고 판단했다.
- `AgentFab`은 오버레이가 열려도 **언마운트하지 않는다**(`aria-hidden`+`tabIndex=-1`+`opacity-0`로 비활성화만). 처음엔 `overlayOpen`일 때 `return null`로 구현했으나, 그러면 닫을 때 포커스를 되돌려줄 안정적인 DOM 노드가 없어져 A-02(포커스 복귀)가 실제로 깨지는 것을 라이브 테스트로 발견해 이 방식으로 바꿨다.
- `AgentOverlay`는 배경 포트폴리오를 `display:none`으로 숨기지 않는다 — `fixed` 오버레이로 시각적으로만 덮고 `body` 스크롤만 잠근다. DD-37이 경고하는 "숨기면 IntersectionObserver가 교차 없음을 보고" 문제 자체가 이 구현에서는 애초에 발생하지 않지만, observer 쪽 수정(마지막 값 유지)은 스펙이 명시적으로 요구하는 정책이라 그대로 구현해 이중으로 방어했다.
- `check-bundle-secrets.ts`는 `.next/server`가 아니라 `.next/static`만 스캔한다 — 서버 전용 코드는 브라우저로 전송되지 않으므로 시크릿이 있어도 정상이고, 거기까지 스캔하면 오탐만 늘어난다.
- Playwright E2E(`playwright.config.ts`)는 자체 `webServer.command`로 `next build && next start`를 실행해 **매번 새로 빌드**한다 — `NEXT_PUBLIC_API_BASE_URL`이 빌드 타임에 번들에 박히는 값이라, 이미 떠 있는 개발 서버를 재사용하면 원하는 "도달 불가 주소"가 실제로 반영됐는지 보장할 수 없기 때문. CI 시간이 늘어나는 대가를 감수했다.
- CI에서 E2E를 기존 `ci` job에 합치지 않고 별도 `e2e` job으로 분리했다 — Playwright 브라우저 설치(`--with-deps`)가 무겁고, 실패 시 원인(단위 테스트 vs E2E)을 빠르게 구분하기 위함.
