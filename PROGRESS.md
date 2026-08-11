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

## 진행 중인 것

- 없음 (이번 세션 작업 자체는 완료. 단, 아래 "다음 단계"의 콘텐츠 검증 게이트는 미해결 상태로 남아있음)

## 다음 단계

- **[SDD-02 §10.1 미충족]** Sentinel Club·Perix Sentinel·SCPC Agent 본문이 아직 "사실 검증 완료" 상태가 아닌 채로 실제 인덱싱(`knowledge.json`)까지 진행했다 — SDD-02가 스스로 "초안 상태 인덱싱 금지"라고 명시한 것과 배치된다. 사용자가 파이프라인 구축을 우선하기로 명시적으로 선택했기 때문이지만, **실제 서비스에 얹기 전에는 콘텐츠 사실 검증 후 `build:knowledge-source` + `build_knowledge.py` 재실행이 필요.**
- **`contact.md`의 LinkedIn·GitHub 링크가 여전히 `TODO` placeholder.** 이것도 인덱싱되어 있으므로(§10.1 두 번째 항목), 실제 링크로 교체 후 재인덱싱 필요.
- 검색 품질: 명확한 질의 8개 중 top-1 정확도 4/8 (top-4 포함 6/8) — 원인은 Case Study `Overview` 절이 다른 절 내용을 요약 언급해 구체 질의에서도 상위 랭크되는 콘텐츠 밀도 문제 (SDD-02 §6.4에 상세 기록). 콘텐츠 사실 검증 시 `Overview`를 더 개괄적으로 다듬으면 개선 여지 있음 — 이후 `calibrate_retrieval.py` 재실행 권장.
- SDD-02 O-12(검색 품질 회귀 테스트 CI 편입)는 아직 미착수 — 평가 셋이 임베딩 API 호출을 필요로 해 결정론적 CI에 부적합하다는 이유로 SDD 자체가 뒤로 미룸.
- SDD-01 DoD 중 사람이 직접 확인해야 하는 항목(브라우저 접근성 등)은 미검증 상태로 남아있음.

## 미결 결정사항

- `contact.md`의 nav order를 6으로 두고 `experience`는 frontmatter 없이 `page.tsx`에서 skills(5)와 contact(6) 사이에 하드코딩 삽입 — SDD-01 §3.1이 "experience는 sections/에 파일을 두지 않는다"고 명시한 것과 일치하는 설계 판단.
- Case Study 본문 HTML 렌더링에 Tailwind Typography 플러그인 대신 `globals.css`의 `.prose-content` 커스텀 규칙 사용 — 의존성 추가를 최소화하기 위한 선택, 추후 필요시 플러그인으로 교체 가능.
- SDD-02 §3.2 임베딩 헤더에서 Case Study **H2 청크에는 `keywords`(tech 배열)를 넣지 않기로 변경**했다(카드 청크에는 유지) — 모든 H2에 동일 tech 배열을 반복하면 같은 프로젝트의 청크들이 서로 지나치게 비슷해져 구체 질의의 top-1 정확도가 떨어지는 것을 실측으로 확인했기 때문. SDD-02 §6.4에 근거 기록.
- `search()`의 지식 인덱스는 모듈 전역 싱글턴(`set_knowledge_index`/`get_knowledge_index`)으로 구현 — SDD-02 §6.2가 보여준 `search(query, *, k, min_score, section)` 시그니처(별도 index 인자 없음)를 그대로 따르기 위한 선택. FastAPI `lifespan`에서 1회 로딩·주입.
