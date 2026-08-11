# UI Refactoring Plan

## 1. Overview

현재 포트폴리오의 기능과 정보 구조는 유지하면서 전체 UI를 리팩터링한다.

현재 디자인의 핵심인 **Black / White / Gray 기반의 minimal style**은 유지한다.

이번 작업의 목표는 화려한 디자인으로 변경하는 것이 아니라,

- 레이아웃 비율
- 콘텐츠 폭
- spacing
- typography hierarchy
- section composition
- AI Agent panel
- responsive behavior
- interaction consistency

를 개선하여 현재의 "정돈된 HTML 문서" 느낌에서  
**실제 엔지니어링 제품 수준의 포트폴리오 UI**로 발전시키는 것이다.

---

# 2. Design Direction

## Core Identity

Portfolio should communicate:

> Backend / AI Agent Engineer  
> Product-oriented Engineering

전체적인 인상은 다음과 같아야 한다.

- Engineering-focused
- Minimal
- Professional
- Product-oriented
- Calm
- Functional

화려함보다는 구조와 디테일로 완성도를 만든다.

## Keep

현재 디자인에서 다음 요소는 유지한다.

- Dark background
- White / Gray typography
- Minimal navigation
- Border-based component separation
- Rounded buttons
- AI Agent side panel
- 현재 정보 구조 및 페이지 section
- 현재 텍스트 콘텐츠

## Avoid

다음 스타일은 사용하지 않는다.

- 과도한 gradient
- neon color
- excessive glow
- heavy glassmorphism
- 지나친 animation
- decorative background graphics
- 지나치게 많은 card UI
- AI-generated landing page 느낌의 디자인

특히 UI를 화려하게 만드는 것이 목적이 아니다.

---

# 3. Layout Refactoring

## 3.1 Global Container

현재 콘텐츠가 화면 중앙에 다소 좁게 모여 보인다.

Desktop에서는 viewport를 조금 더 적극적으로 사용한다.

권장 구조:

```css
.page-container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding-inline: 32px;
}
```

정확한 값은 기존 구조와 breakpoint를 고려해 조정 가능하다.

Target:

- Desktop: 약 1200~1320px
- Tablet: fluid width
- Mobile: 16~20px horizontal padding

### Important

단순히 `padding`만 줄이지 않는다.

다음 요소를 함께 검토한다.

- max-width
- width
- padding-inline
- grid columns
- gap

---

# 4. Desktop Main Layout

Hero 영역은 크게 두 column으로 구성한다.

```text
┌──────────────────────────────────────────────────────┐

  Navigation

────────────────────────────────────────────────────────

  Main Introduction                    AI Agent
  ┌────────────────────────────┐       ┌──────────────┐
  │ Haewon Park                │       │ AI Agent     │
  │                            │       │              │
  │ Backend / AI Agent Eng.    │       │ Chat         │
  │                            │       │              │
  │ Description                │       │              │
  │                            │       │              │
  │ CTA                        │       │ Input        │
  └────────────────────────────┘       └──────────────┘

────────────────────────────────────────────────────────

  About
```

Recommended starting point:

```css
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 48px;
}
```

Agent panel width는 약:

```text
340px ~ 400px
```

범위에서 전체 디자인과 맞게 결정한다.

---

# 5. Hero Section

현재 Hero section은 좋은 구조를 가지고 있지만
vertical whitespace가 다소 크다.

## Improve

다음 hierarchy를 명확하게 만든다.

```text
Haewon Park

Backend / AI Agent Engineer

Product-oriented Engineering ...

REST API ...

[ Explore My Work ] [ Ask My AI ]
```

### Heading

`Haewon Park`는 페이지에서 가장 강한 typography를 가진다.

Desktop 기준 약:

```text
44px ~ 52px
```

정도가 적절하다.

### Role

`Backend / AI Agent Engineer`는 현재보다 조금 더 명확하게 강조한다.

이 텍스트는 이름 다음으로 중요한 identity information이다.

### Description

본문은 heading과 경쟁하지 않도록 secondary gray를 유지한다.

다만 contrast가 너무 낮아 가독성을 해치지 않도록 한다.

### Hero Vertical Spacing

현재 Hero 아래쪽 whitespace를 줄인다.

목표는:

```text
현재:

Hero
↓
큰 빈 공간
↓
About


개선:

Hero
↓
적절한 breathing room
↓
divider
↓
About
```

section 사이 간격은 전체적으로 일관된 spacing system을 사용한다.

---

# 6. Spacing System

임의의 margin/padding 값을 반복해서 추가하지 않는다.

가능하면 작은 spacing scale을 정의한다.

Example:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;
```

필요하다면 기존 Tailwind / CSS convention을 따른다.

목표는:

> 비슷한 의미의 간격은 같은 값을 사용한다.

---

# 7. Typography

Typography hierarchy를 명확하게 정리한다.

대략 다음 단계로 구분한다.

```text
H1       → Name
H2       → Section title
H3       → Card / item title
Lead     → Role / important description
Body     → Main content
Muted    → Secondary information
Meta     → Small metadata / labels
```

각 typography level에 대해:

- font-size
- font-weight
- line-height
- color

를 일관되게 적용한다.

## Line Height

본문의 line-height가 너무 촘촘하지 않도록 한다.

긴 설명 문장은 읽기 편해야 한다.

---

# 8. AI Agent Panel

AI Agent는 단순한 sidebar widget이 아니라
이 포트폴리오의 핵심 interactive feature 중 하나다.

따라서 시각적 존재감을 조금 강화한다.

하지만 Hero headline보다 강하게 만들지는 않는다.

## Structure

```text
┌──────────────────────────────┐
│ AI Agent                     │
├──────────────────────────────┤
│                              │
│ Ask me about Haewon's...     │
│                              │
│ [ suggestion ]               │
│ [ suggestion ]               │
│ [ suggestion ]               │
│                              │
│                              │
├──────────────────────────────┤
│ Security / privacy notice    │
├──────────────────────────────┤
│ Input                   Send │
└──────────────────────────────┘
```

## Improve

다음 요소를 검토한다.

- panel internal padding
- border contrast
- input height
- Send button alignment
- suggestion chip spacing
- suggestion chip hover state
- chat area vertical balance
- privacy notice typography
- empty space distribution

### Suggestion Chips

현재 suggestion UI는 좋은 방향이다.

다만:

- chip 간격
- border
- padding
- hover state
- text wrapping

을 정리한다.

### Security Notice

Security notice는 유지한다.

이 메시지는 AI Agent를 사용할 때 민감한 정보를 공유하지 말라는
제품의 중요한 safety message이다.

다만 main UI보다 강하지 않도록 muted text로 표현한다.

---

# 9. About Section

현재 About section은 다음과 같은 문서형 구조를 가지고 있다.

```text
About

I build with users in mind
description

I care about maintainability
description
```

내용은 유지하되 layout을 조금 더 구조화한다.

## Desktop Proposal

2-column grid를 우선 검토한다.

```text
About

┌────────────────────────┐  ┌────────────────────────┐
│ Product Mindset        │  │ Maintainability        │
│                        │  │                        │
│ Users and actual       │  │ Collaborative and      │
│ product needs...       │  │ maintainable systems...│
└────────────────────────┘  └────────────────────────┘
```

단, card가 너무 많은 SaaS landing page처럼 보이지 않도록 한다.

### Card style

카드를 사용할 경우:

- background color 차이를 최소화
- subtle border
- moderate radius
- no shadow 또는 매우 약한 shadow
- generous internal padding

정도로 처리한다.

---

# 10. Remaining Sections

다음 sections에도 동일한 design language를 적용한다.

- What I Build
- How I Work
- Skills
- Experience
- Contact

각 section이 단순히 아래로 이어지는 markdown document처럼 느껴지지 않도록 한다.

하지만 모든 section을 card로 만드는 것도 피한다.

정보 특성에 따라:

- grid
- list
- timeline
- bordered rows
- cards

중 적절한 layout을 선택한다.

---

# 11. Navigation

현재 navigation 구조는 유지한다.

```text
Home
About
What I Build
How I Work
Skills
Experience
Contact
```

Improve:

- spacing consistency
- hover state
- active section state (가능하면)
- mobile behavior

navigation이 content container와 정확히 정렬되도록 한다.

---

# 12. Responsive Design

반드시 다음 viewport를 고려한다.

```text
Desktop
>= 1200px

Laptop / Tablet Landscape
768px ~ 1199px

Mobile
< 768px
```

## Desktop

Hero:

```text
Main content | AI Agent
```

two-column 유지.

## Tablet

공간이 부족하다면 Agent width를 줄이거나 grid gap을 줄인다.

## Mobile

Hero는 반드시 single-column으로 전환한다.

Recommended:

```text
Name
Role
Description
CTA

AI Agent

About

What I Build
...
```

예:

```css
@media (max-width: 768px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
}
```

Mobile horizontal padding:

```text
16px ~ 20px
```

정도로 유지한다.

---

# 13. Buttons

CTA button design을 통일한다.

Primary:

```text
Explore My Work
```

Secondary:

```text
Ask My AI
```

Primary와 Secondary의 hierarchy를 명확하게 유지한다.

## Interaction

buttons에는 최소한 다음 상태를 제공한다.

- default
- hover
- active
- focus-visible
- disabled (필요할 경우)

transition은 짧고 subtle하게 적용한다.

Example:

```css
transition: background-color 150ms ease,
            border-color 150ms ease,
            color 150ms ease;
```

---

# 14. Interaction

Animation은 최소화한다.

Allowed:

- button hover
- navigation hover
- chip hover
- card border transition
- subtle section entrance if already implemented

Avoid:

- excessive scroll animation
- parallax
- large scale transforms
- glowing animations
- animated gradients

Interaction의 목적은:

> UI가 살아 있다는 느낌을 제공하는 것

이지 시선을 빼앗는 것이 아니다.

---

# 15. Accessibility

리팩터링하면서 기본 accessibility를 확인한다.

Check:

- semantic HTML
- button vs anchor semantics
- keyboard navigation
- visible focus states
- sufficient text contrast
- input labels / aria-label
- heading hierarchy
- mobile tap target size

---

# 16. Technical Constraints

이번 작업에서는 UI refactoring만 수행한다.

가능하면 다음 요소는 변경하지 않는다.

- API behavior
- AI Agent logic
- RAG logic
- backend communication
- routing behavior
- state management
- existing business logic
- data structure
- analytics behavior

## Important

UI 리팩터링 과정에서 기존 기능이 깨지지 않아야 한다.

---

# 17. Code Quality

리팩터링 과정에서 중복된 CSS / class를 정리한다.

가능하면 reusable primitives를 사용한다.

예:

```text
Container
Section
SectionTitle
Button
Card
Divider
Tag / Chip
```

단, 단순한 UI까지 과도하게 component abstraction 하지 않는다.

Rule:

> Reuse when repetition exists.  
> Do not abstract only for abstraction's sake.

---

# 18. Implementation Order

다음 순서대로 작업한다.

## Phase 1 — Layout Foundation

먼저:

1. Global container
2. max-width
3. horizontal padding
4. Hero grid
5. Agent width
6. section spacing

을 수정한다.

이 단계에서는 세부 decoration을 변경하지 않는다.

## Phase 2 — Typography

다음 typography hierarchy를 정리한다.

- H1
- H2
- H3
- Lead
- Body
- Muted
- Meta

## Phase 3 — Hero

다음 요소를 개선한다.

- vertical spacing
- CTA
- text width
- hierarchy

## Phase 4 — AI Agent

다음 요소를 개선한다.

- panel proportions
- internal spacing
- suggestion chips
- input
- security notice

## Phase 5 — Content Sections

다음 sections를 리팩터링한다.

- About
- What I Build
- How I Work
- Skills
- Experience
- Contact

## Phase 6 — Responsive

Desktop 완료 후:

- Tablet
- Mobile

viewport를 검증한다.

## Phase 7 — Polish

마지막으로:

- hover
- transition
- focus
- border consistency
- radius consistency
- alignment

을 검토한다.

---

# 19. Acceptance Criteria

리팩터링 완료 후 아래 조건을 만족해야 한다.

### Layout

- [ ] Desktop viewport를 현재보다 효율적으로 사용한다.
- [ ] 콘텐츠가 지나치게 가운데에 좁게 모이지 않는다.
- [ ] Main content와 AI Agent의 비율이 자연스럽다.
- [ ] section spacing이 일관적이다.
- [ ] Hero의 과도한 vertical whitespace가 제거되었다.

### Visual

- [ ] 기존 dark minimal identity가 유지된다.
- [ ] typography hierarchy가 명확하다.
- [ ] AI Agent가 별도의 임시 widget처럼 보이지 않는다.
- [ ] 모든 section이 단순한 README처럼 보이지 않는다.
- [ ] 불필요한 decoration이 추가되지 않았다.

### Responsive

- [ ] Desktop layout 정상
- [ ] Tablet layout 정상
- [ ] Mobile layout 정상
- [ ] Mobile에서 horizontal overflow가 없다.
- [ ] Agent panel이 mobile에서 정상적으로 stack된다.

### Functionality

- [ ] Navigation 정상
- [ ] CTA 정상
- [ ] AI Agent 정상
- [ ] Suggested prompts 정상
- [ ] Input / Send 정상
- [ ] 기존 기능 regression 없음

---

# 20. Final Principle

이번 UI 리팩터링의 최우선 원칙:

> Make it feel engineered, not decorated.

화려한 디자인 요소를 추가해서 완성도를 높이지 않는다.

대신

- alignment
- hierarchy
- spacing
- proportion
- typography
- interaction
- consistency

를 통해 완성도를 높인다.

이 포트폴리오는 디자이너의 포트폴리오가 아니라

> Backend / AI Agent Engineer who builds usable products

라는 인상을 전달해야 한다.

---

# Claude Code Execution Prompt

Claude Code에서 이 문서를 기준으로 작업할 때는 아래 지시문을 함께 사용한다.

```text
Read docs/UI_REFACTORING.md first.

Before modifying code:
1. Inspect the existing page/component structure and styling architecture.
2. Identify which files control the global container, hero layout, AI Agent panel, and responsive styles.
3. Create a short implementation plan.
4. Then perform the refactoring incrementally following the phases in the document.

Do not rewrite the application from scratch.
Do not change existing business logic or AI Agent behavior.
Preserve the current dark minimal visual identity.

After each major phase, verify that the existing functionality has not regressed.
```

UI 작업은 한 번에 전체를 크게 바꾸기보다 Phase 단위로 진행하고,
각 Phase 완료 후 실제 브라우저 화면을 확인한 다음 다음 단계로 넘어간다.
