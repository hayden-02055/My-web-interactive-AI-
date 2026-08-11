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

## 진행 중인 것

- 없음 (이번 세션 작업 자체는 완료. 단, 아래 "다음 단계"의 항목들은 미해결 상태로 남아있음)

## 다음 단계

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
