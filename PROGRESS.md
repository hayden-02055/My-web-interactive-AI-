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

## 진행 중인 것

- 없음 (SDD-01 구현 자체는 완료)

## 다음 단계

- **`contact.md`의 LinkedIn·GitHub 링크가 `TODO` placeholder 상태.** 실제 프로필 URL로 교체 필요 (사용자 요청에 따라 의도적으로 placeholder로 남김).
- Sentinel Club / Perix Sentinel / SCPC Agent 3개 Case Study 본문(Problem/Solution/Architecture/Result 등)은 사용자가 채팅으로 준 요약 정보를 근거로 초안 작성함 — 더 구체적인 사실(세부 아키텍처, 정량 결과 등)이 생기면 갱신 필요. Fingoo는 SDD-01 문서에 이미 있던 실제 정보를 그대로 사용.
- SDD-02(지식 인덱스)가 이 SDD-01의 `getSections()`/`getCaseStudies()` 및 §3.4 anchors 테이블을 소비할 예정 — Python 쪽 동일 매핑 테이블 구현 필요.
- DoD 체크리스트 중 사람이 직접 확인해야 하는 항목(모바일 뷰포트 육안 확인, 브라우저 접근성 등)은 미검증 상태.

## 미결 결정사항

- `contact.md`의 nav order를 6으로 두고 `experience`는 frontmatter 없이 `page.tsx`에서 skills(5)와 contact(6) 사이에 하드코딩 삽입 — SDD-01 §3.1이 "experience는 sections/에 파일을 두지 않는다"고 명시한 것과 일치하는 설계 판단.
- Case Study 본문 HTML 렌더링에 Tailwind Typography 플러그인 대신 `globals.css`의 `.prose-content` 커스텀 규칙 사용 — 의존성 추가를 최소화하기 위한 선택, 추후 필요시 플러그인으로 교체 가능.
