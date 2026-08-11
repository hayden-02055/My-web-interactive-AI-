# SDD-01 — Content Schema & Static Portfolio

| | |
|---|---|
| **Document** | SDD-01 |
| **Title** | Content Schema & Static Portfolio |
| **Status** | Draft |
| **Version** | v0.1 |
| **Upstream** | PRD v0.1 · SDD-00 v0.1 |
| **Author** | 박해원 |
| **Phase** | 1단계 · 기반 |
| **Covers** | FR-01, FR-12(부분) |

---

## 1. Purpose

Agent 없이 완결되는 포트폴리오를 구현하고, **이후 모든 단계가 소비할 콘텐츠 계약**을 확정한다.

이 SDD의 산출물은 두 종류다.

| 산출물 | 소비 주체 |
|---|---|
| 렌더링된 정적 사이트 | 방문자 |
| **콘텐츠 스키마** | SDD-02 지식 인덱스, SDD-05 내비게이션, SDD-07 Case Study 연결 |

두 번째가 더 중요하다. 스키마가 흔들리면 SDD-02·05·07이 연쇄 재작업된다.

### 1.1 In Scope

- 콘텐츠 파일 구조 및 frontmatter 스키마
- Case Study 본문 구조 계약 (고정 H2 집합)
- Anchor ID 체계
- 라우팅 및 2-column 레이아웃
- Markdown 렌더링 파이프라인
- 디자인 토큰 배치
- 콘텐츠 스키마 검증 게이트

### 1.2 Out of Scope

| 항목 | 이관 |
|---|---|
| 청킹 전략 · 임베딩 | SDD-02 |
| Agent 패널 내부 구현 | SDD-04 |
| Case Study 필터링 | P1 (PRD §15) |
| Contact 폼 전송 | SDD-08 |
| 모바일 Agent 전환 | SDD-09 |

---

## 2. Design Decisions

### DD-01 · 단일 라우트 + Anchor 스크롤

전체 포트폴리오를 `/` 하나의 라우트에 배치하고, 섹션 간 이동은 anchor 스크롤로 처리한다. Case Study도 별도 라우트를 갖지 않고 `experience` 섹션 내부에 인라인 배치한다.

**근거**

- **INV-02가 구조적으로 만족된다.** 라우팅이 없으므로 내비게이션이 네트워크를 탈 방법 자체가 없다
- **Agent 대화 컨텍스트 유지(PRD §6)가 무료로 성립한다.** 언마운트가 발생하지 않는다
- 전체 SSG 가능 → INV-01 자동 충족

**기각안**

| 대안 | 기각 사유 |
|---|---|
| Case Study별 라우트 (`/work/fingoo`) | App Router 레이아웃으로 컨텍스트 유지는 가능하나, MVP에서 얻는 가치 없이 복잡도만 증가 |
| 클라이언트 사이드 탭 전환 | 스크롤 위치 기반 섹션 감지(SDD-04)와 충돌 |

**대가**

초기 문서 길이가 길어진다. Case Study 4개 기준 감내 가능하며, 필요 시 P1의 접기/펼치기로 대응한다.

### DD-02 · Case Study 본문은 고정 H2 집합을 갖는다

PRD §8.6의 Case Study Schema를 **frontmatter가 아니라 본문 H2 헤딩의 닫힌 집합**으로 구현한다.

**근거 — 이게 이 SDD의 핵심 결정이다**

고정 H2 집합은 세 가지를 동시에 해결한다.

```text
고정 H2 헤딩
  ├─→ 렌더링 구조        일관된 Case Study 레이아웃
  ├─→ 청크 경계          SDD-02가 슬라이딩 윈도우를 발명할 필요 없음
  └─→ 앵커 타깃          Agent가 "Fingoo의 아키텍처" 로 딥링크 제안 가능
```

특히 두 번째가 크다. 임의 길이 텍스트를 기계적으로 자르면 청크가 의미 단위와 어긋나 검색 품질이 떨어진다. **저자가 이미 의미 단위로 나눠 쓴 문서**를 그대로 청크 경계로 쓰면 이 문제가 사라진다.

**기각안**

| 대안 | 기각 사유 |
|---|---|
| frontmatter에 10개 필드로 수납 | 긴 산문을 YAML에 넣는 것은 편집성이 최악 |
| 자유 형식 Markdown | 청크 경계와 앵커를 슬러그화에 의존 → DD-03 문제 발생 |

### DD-03 · Anchor는 슬러그화하지 않고 매핑 테이블로 생성한다

헤딩 텍스트를 슬러그화해서 앵커를 만들지 않는다. **고정 키 매핑 테이블**을 통해 생성한다.

**근거**

앵커는 TypeScript(렌더링)와 Python(인덱싱) 양쪽에서 **동일하게** 계산되어야 한다. 슬러그화 함수는 언어별 구현 차이(유니코드 정규화, 연속 하이픈, 대소문자)로 반드시 어긋난다. 어긋나면 Agent가 존재하지 않는 앵커를 제안한다.

헤딩 집합이 닫혀 있으므로(DD-02), 슬러그화 대신 **10줄짜리 룩업 테이블**로 충분하다.

### DD-04 · Agent 슬롯은 SDD-01에서 자리만 잡는다

우측 Agent 영역을 레이아웃 상 확정하고, 내부에는 비활성 placeholder를 렌더링한다.

**근거**

SDD-04에서 패널을 붙일 때 레이아웃을 다시 짜면 좌측 콘텐츠 전체가 영향을 받는다. 자리를 먼저 고정하면 SDD-04는 슬롯 내부만 채우면 된다.

### DD-05 · 콘텐츠 순서는 frontmatter `order`가 결정한다

별도 레지스트리 파일을 두지 않는다. 각 콘텐츠 파일의 `order` 값으로 정렬한다.

**근거**

레지스트리 파일을 TypeScript로 두면 Python이 읽을 수 없고(AD-05와 동일 문제), JSON으로 두면 콘텐츠 파일과 이중 관리가 된다. `order`를 frontmatter에 두면 파일 하나가 자기 위치를 스스로 안다.

---

## 3. Content Structure

### 3.1 Directory

```text
web/src/content/
├── sections/
│   ├── hero.md
│   ├── about.md
│   ├── what-i-build.md
│   ├── how-i-work.md
│   ├── skills.md
│   └── contact.md
└── case-studies/
    ├── fingoo.md
    ├── sentinel-club.md
    ├── perix-sentinel.md
    └── scpc-agent.md
```

- 파일명은 kebab-case이며 `id` frontmatter와 일치해야 한다
- `experience` 섹션은 `sections/`에 파일을 두지 않는다. Case Study 목록으로 구성되는 컨테이너 섹션이다

### 3.2 Section Frontmatter

```yaml
---
id: about                    # required · kebab-case · 파일명과 일치
title: About                 # required · 화면 제목
nav_label: About             # required · 내비게이션 라벨
order: 2                     # required · 정수, 전역 유일
summary: >                   # required · 1~2문장, 검색 스니펫용
  엔지니어링 정체성 — 사용자 중심, 유지보수성,
  트레이드오프 판단, 비용 고려.
retrievable: true            # required · 지식 인덱스 포함 여부
keywords: [philosophy, engineering identity]   # optional
---
```

| 필드 | 타입 | 용도 |
|---|---|---|
| `id` | string | 앵커 · 인덱스 키 |
| `title` | string | UI 헤딩 |
| `nav_label` | string | 내비게이션 · Agent 제안 라벨 |
| `order` | int | 정렬 |
| `summary` | string | 검색 결과 스니펫, Agent 응답 근거 표시 |
| `retrievable` | bool | `false`면 인덱스에서 제외 |
| `keywords` | string[] | 검색 보조 (SDD-02 선택 사용) |

**`retrievable: false` 대상**

`hero` — 마케팅 카피이며 지식이 아니다. 검색 결과로 반환되면 Agent 답변 품질을 떨어뜨린다.

### 3.3 Case Study Frontmatter

```yaml
---
id: fingoo                   # required
title: Fingoo                # required
category: Backend / Production Experience   # required
status: shipped              # required · 아래 열거값
period: 2024 – 2026          # required
order: 1                     # required · case-studies 내 정렬
summary: >                   # required
  금융 교육 서비스의 백엔드 아키텍처 설계와
  LangGraph 멀티에이전트 시스템 정리·인수인계.
tech: [NestJS, TypeScript, PostgreSQL, Redis]   # required
retrievable: true            # required
---
```

**`status` 열거값**

| 값 | 의미 |
|---|---|
| `shipped` | 운영 배포되었거나 완료됨 |
| `in-progress` | 현재 개발 중 |
| `prototype` | 동작하는 프로토타입 단계 |
| `archived` | 중단·보관 |

> PRD §8.6 — "개발 상태는 실제 상태에 맞춰 명확하게 표기한다."
> 상태를 모호하게 두는 것은 PRD §5.5(신뢰)의 직접 위반이다. 필수 필드로 강제한다.

**`tech`**

PRD §8.6 스키마의 `Tech Stack`에 대응한다. 본문 H2로 중복 배치하지 않는다.

### 3.4 Case Study Body — 고정 H2 집합

본문은 아래 H2만 사용한다. 순서는 고정이며, 목록에 없는 H2는 검증 실패다.

| 순서 | H2 텍스트 | 키 | 필수 | PRD §8.6 대응 |
|---|---|---|---|---|
| 1 | `Overview` | `overview` | ✅ | Overview |
| 2 | `Problem` | `problem` | ✅ | Problem |
| 3 | `My Role` | `role` | ✅ | My Role |
| 4 | `Constraints` | `constraints` | — | Constraints |
| 5 | `Solution` | `solution` | ✅ | Solution |
| 6 | `Architecture` | `architecture` | — | Architecture |
| 7 | `Key Decisions` | `decisions` | ✅ | Key Decisions |
| 8 | `Result` | `result` | ✅ | Result |
| 9 | `What I Learned` | `learned` | — | What I Learned |

H3 이하는 자유롭게 사용할 수 있으나 청크 경계와 앵커 타깃이 되지 않는다.

**예시**

```markdown
## Overview

Fingoo는 투자 분석에서 금융 교육으로 피벗한 서비스다. ...

## Problem

LangGraph 기반 멀티에이전트 시스템이 제품 방향 변경 이후 ...

## My Role

CTO 겸 AI/Backend 개발자로서 ...
```

### 3.5 Anchor ID Scheme

```text
섹션            #<section-id>
                #about, #skills, #contact

Case Study      #experience-<case-id>
                #experience-fingoo

Case Study 절   #experience-<case-id>-<heading-key>
                #experience-fingoo-architecture
```

- PRD §11의 `#experience-fingoo` 예시와 일치한다
- 생성은 매핑 테이블 기반이며 슬러그화하지 않는다 (DD-03)
- 매핑 테이블은 §3.4 표를 단일 근거로 하며, TS·Python 양쪽 구현이 이 표를 참조한다

### 3.6 Retrieval Contract

SDD-02가 인덱스를 만들 때 각 청크가 반환할 최소 형태를 여기서 고정한다.

```json
{
  "content": "...",
  "section": "experience",
  "anchor": "experience-fingoo-architecture",
  "label": "Fingoo — Architecture"
}
```

> PRD §9.2가 요구하는 `{content, section, anchor}`를 만족하며, Agent 제안 UI(SDD-05)에 필요한 `label`을 추가한다.
> 벡터·점수 등 검색 내부 필드는 SDD-02 소관이다.

---

## 4. Content Validation Gate

콘텐츠 스키마 위반을 빌드에서 차단한다.

### 4.1 검증 규칙

| # | 규칙 |
|---|---|
| V-01 | 모든 필수 frontmatter 필드 존재 |
| V-02 | `id`가 파일명과 일치 |
| V-03 | `id`가 전역 유일 |
| V-04 | `order`가 정수이며 동일 컬렉션 내 중복 없음 |
| V-05 | `status`가 열거값에 속함 |
| V-06 | Case Study 본문의 H2가 §3.4 집합에 속함 |
| V-07 | Case Study 필수 H2가 모두 존재 |
| V-08 | H2 순서가 §3.4 순서와 일치 |
| V-09 | `summary`가 비어 있지 않음 |

### 4.2 실행 지점

```bash
pnpm validate:content
```

- `pnpm build`의 선행 단계로 연결한다
- SDD-00 §8.1 CI 파이프라인에 추가한다

**근거**

콘텐츠는 SDD-02·05·07이 소비하는 계약이다. 계약 위반이 런타임까지 살아 나가면 Agent가 존재하지 않는 앵커를 제안하거나 인덱스가 조용히 비어 있게 된다. **LLM 판단이 아닌 결정론적 게이트로 차단한다.**

---

## 5. Rendering Pipeline

```text
content/**/*.md
      ↓  frontmatter 파싱 · 스키마 검증
      ↓  Markdown → HTML (빌드 시점)
      ↓  H2 → 앵커 부착 (§3.5 매핑 테이블)
      ↓  order 정렬
  Static page (SSG)
```

### 5.1 구성 원칙

- **런타임 파싱 금지.** 모든 변환은 빌드 시점에 끝난다 (INV-01)
- 앵커 부착은 자동 슬러그 플러그인이 아니라 §3.5 매핑을 사용한다
- 콘텐츠 로딩 모듈은 `web/src/lib/content/`에 배치한다

### 5.2 타입 정의

frontmatter 타입은 `web/src/types/content.ts`에 선언한다. `web/src/types/api.ts`(백엔드 계약 미러)와 분리한다 — 두 계약의 변경 주기가 다르다.

---

## 6. Layout

### 6.1 Desktop

```text
┌───────────────────────────────┬──────────────────┐
│  Portfolio                    │  Agent slot      │
│  scrollable                   │  sticky          │
│  max-width 콘텐츠 컬럼        │  고정 폭          │
└───────────────────────────────┴──────────────────┘
```

- CSS Grid 2컬럼. Agent 슬롯은 고정 폭, 좌측이 나머지를 차지
- Agent 슬롯은 `position: sticky`로 뷰포트에 고정
- SDD-01에서는 슬롯 내부에 **비활성 placeholder**를 렌더링한다 (DD-04)

### 6.2 Mobile

SDD-01에서는 **Agent 슬롯을 렌더링하지 않는다.** 단일 컬럼으로 포트폴리오만 표시한다.

모바일 Agent 전환(bottom sheet / floating / overlay)은 SDD-09에서 결정한다. 지금 임시 구현을 넣으면 SDD-09에서 폐기된다.

### 6.3 Component Placement

```text
web/src/components/portfolio/
├── PortfolioLayout.tsx      # 2컬럼 그리드
├── SectionNav.tsx           # 섹션 내비게이션
├── SectionContainer.tsx     # 섹션 공통 래퍼 · 앵커 부착
├── HeroSection.tsx
├── CaseStudyList.tsx
└── CaseStudyCard.tsx

web/src/components/agent/
└── AgentSlotPlaceholder.tsx # 비활성 placeholder
```

> SDD-00 §6.3 — `portfolio`와 `agent`는 서로 import하지 않는다. 레이아웃 조립은 `app/page.tsx`에서 수행한다.

---

## 7. Design Tokens

Tailwind CSS v4의 CSS-first 설정을 사용한다.

- 토큰은 `web/src/app/globals.css`의 `@theme` 블록에 단일 정의한다
- 컴포넌트에서 임의 hex 값을 직접 쓰지 않는다
- 토큰 명명은 역할 기반으로 한다 (`--color-surface`, `--color-text-muted`). 색상명 기반(`--color-blue-500`)을 피한다

> 설치본이 v4 계열이 아니거나 설정 방식이 다르면 이 절을 실제 구성에 맞춰 개정한다.

---

## 8. Content Authoring — V1 대상

| 파일 | 근거 | 비고 |
|---|---|---|
| `hero.md` | PRD §8.1 | `retrievable: false` |
| `about.md` | PRD §8.2 | 개인 Biography 제외 |
| `what-i-build.md` | PRD §8.3 | Backend API / AI Agent 2축 |
| `how-i-work.md` | PRD §8.4 | 9단계 프로세스 + 완료 정의 |
| `skills.md` | PRD §8.5 | Case Study로 증명 가능한 것 우선 |
| `contact.md` | PRD §8.7 | Email · LinkedIn · GitHub |
| `fingoo.md` | PRD §8.6 | `status: shipped` |
| `sentinel-club.md` | PRD §8.6 | 실제 상태 반영 필수 |
| `perix-sentinel.md` | PRD §8.6 | |
| `scpc-agent.md` | PRD §8.6 | |

**Contact 관련**

SDD-01은 Contact를 정적 링크(mailto · 외부 프로필)와 CTA 텍스트로 구현한다. 이 시점에 **FR-12(Agent 없이 Contact 가능)가 이미 충족된다.** SDD-08은 폼 기반 경로를 추가하는 것이지 FR-12를 처음 만족시키는 것이 아니다.

---

## 9. Deliverables

| # | 산출물 |
|---|---|
| D-01 | `content/` 디렉토리 및 10개 콘텐츠 파일 |
| D-02 | frontmatter 타입 정의 (`types/content.ts`) |
| D-03 | 콘텐츠 로더 (`lib/content/`) |
| D-04 | 앵커 매핑 테이블 |
| D-05 | 검증 스크립트 + `pnpm validate:content` |
| D-06 | 2컬럼 레이아웃 + Agent 슬롯 placeholder |
| D-07 | 섹션 컴포넌트 일습 |
| D-08 | 섹션 내비게이션 |
| D-09 | `@theme` 디자인 토큰 |
| D-10 | CI에 검증 게이트 추가 (SDD-00 §8.1 개정) |

---

## 10. Definition of Done

- [ ] 10개 콘텐츠 파일 작성, §3.2 / §3.3 스키마 준수
- [ ] `pnpm validate:content` 통과
- [ ] 의도적 스키마 위반(필수 H2 누락 등)이 검증 실패로 잡히는 것 확인
- [ ] `pnpm build` 성공, 전 섹션 SSG 렌더링
- [ ] 7개 섹션 + 4개 Case Study 모두 앵커로 도달 가능
- [ ] Case Study 절 단위 앵커(`#experience-fingoo-architecture`) 동작 확인
- [ ] Agent 슬롯 placeholder가 레이아웃 상 확정됨
- [ ] 모바일 뷰포트에서 단일 컬럼 정상 표시
- [ ] **백엔드 미기동 상태에서 전 섹션 탐색 및 Contact 도달 가능** (INV-01)
- [ ] 내비게이션 클릭 시 네트워크 요청 0회 (INV-02)
- [ ] `pnpm lint` / `typecheck` 통과
- [ ] CI에 검증 게이트 반영

---

## 11. Traceability

| 요구 | 대응 |
|---|---|
| FR-01 | §6, §8 — Agent 없이 전 콘텐츠 탐색 |
| FR-12 | §8 — 정적 Contact 채널 |
| PRD §7 | §3.1, DD-05 — 섹션 순서 |
| PRD §8.1–8.7 | §8 — 콘텐츠 대상 |
| PRD §9.2 | §3.6 — retrieval contract |
| PRD §11 | §3.5 — 앵커 형식 |
| INV-01 | §5.1, DoD |
| INV-02 | DD-01, DoD |
| INV-03 | §3.1 — 단일 소스 |

---

## 12. Open Items

| # | 항목 | 시점 |
|---|---|---|
| O-06 | Case Study 접기/펼치기 도입 여부 | 실제 문서 길이 확인 후 |
| O-07 | `keywords` 필드의 검색 반영 방식 | SDD-02 |
| O-08 | 섹션 내비게이션의 현재 위치 하이라이트 | SDD-04 (섹션 감지와 통합) |

---

## 13. Revision History

| 버전 | 일자 | 변경 |
|---|---|---|
| v0.1 | 2026-08-07 | 최초 작성 |
