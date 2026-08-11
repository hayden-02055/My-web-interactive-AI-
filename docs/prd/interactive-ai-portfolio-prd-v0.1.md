# Interactive AI Portfolio — PRD v0.1

**Document Status:** Draft  
**Product Type:** Personal Portfolio / Client Acquisition Website  
**Primary Goal:** 외주 클라이언트 유입 및 개발 역량 증명  
**Secondary Goal:** AI Agent가 실제 제품에서 어떻게 활용될 수 있는지 체험으로 증명

---

## 1. Product Overview

Interactive AI Portfolio는 박해원의 개발 경험과 기술 역량을 보여주는 포트폴리오이자, 잠재 클라이언트가 개발 가능성을 상담할 수 있는 웹사이트다.

일반적인 포트폴리오와 달리 화면 우측에 **Persistent AI Agent**가 항상 존재한다.

사용자는 두 가지 방식으로 사이트를 탐색할 수 있다.

```text
Traditional
User → Browse Portfolio → Read Case Study → Contact

Agent-assisted
User → Ask Agent
     → Agent understands current context
     → Answers / proposes solution
     → Suggests relevant content
     → User chooses to navigate
     → Contact
```

AI Agent는 단순히 포트폴리오 내용을 요약하거나 문장을 생성하는 챗봇이 아니다.

**Context를 이해하고, 정보를 탐색하고, 제품 인터페이스와 연결되고, 사용자의 다음 행동을 제안하는 실제 Agent 경험을 제공한다.**

---

## 2. Problem

### 2.1 Client Problem

AI 서비스를 만들고 싶은 초기 클라이언트는 다음 문제를 겪는다.

- 아이디어가 기술적으로 가능한지 판단하기 어렵다.
- MVP에 필요한 기능 범위를 결정하기 어렵다.
- 어떤 아키텍처가 필요한지 알기 어렵다.
- 개발자의 실제 역량을 포트폴리오만으로 판단하기 어렵다.
- 처음부터 큰 개발비를 투자하는 것은 위험하다.

### 2.2 Portfolio Problem

일반적인 개발자 포트폴리오는 다음 방식으로 기술력을 주장한다.

> "AI Agent 개발 경험이 있습니다."  
> "RAG를 사용할 수 있습니다."  
> "Backend Architecture를 설계할 수 있습니다."

하지만 방문자는 실제로 그 능력을 검증하기 어렵다.

본 제품은 이를 반대로 접근한다.

> **Don't just explain what an AI agent can do. Let users experience it.**

---

## 3. Product Positioning

사용자가 사이트를 떠난 뒤 박해원을 다음과 같이 기억하는 것을 목표로 한다.

> **Backend를 기반으로 AI Agent를 만들며, 기술뿐 아니라 실제 제품의 쓸모·비용·검증까지 생각하는 엔지니어.**

핵심 Value Proposition:

> **Build something useful. Validate it fast and cost-efficiently. If it isn't useful, make it cheap to find out.**

핵심 포지셔닝 키워드:

**Backend Engineering + AI Agent Engineering + Product Thinking**

단, 특정 산업 전문지식이 프로젝트의 핵심이 되는 고도 도메인 프로젝트는 주요 서비스 대상으로 하지 않는다.

예:

- CAD 전문 AI
- 특정 의료 전문 시스템
- 제조공정 전문 시스템

등은 우선적인 수주 대상이 아니다.

---

## 4. Target Users

### Primary Persona — Non-technical Founder / Client

AI 아이디어가 있지만 구체적인 기술 명세가 없는 사람.

원하는 것:

- 구현 가능 여부 확인
- MVP 범위 정의
- 간단한 아키텍처
- 실제 구현

기술을 잘 몰라도 서비스를 이용할 수 있어야 한다.

### Secondary Persona — Technical Founder / Developer

AI 또는 Backend 시스템을 만들고 있으며 협업 가능한 개발자를 찾고 있는 사람.

관심 요소:

- Architecture
- Code quality
- Agent design
- Technical decision
- Case Study
- Agent execution pipeline

### Tertiary Persona — Recruiter / Engineer / Network

박해원의 개발 스타일과 기술 수준을 빠르게 파악하려는 방문자.

---

## 5. Product Principles

### 5.1 Useful before impressive

기술적으로 화려한 기능보다 실제로 필요한 기능을 우선한다.

항상 먼저 질문한다.

> **Is this necessary, or merely nice to have?**

### 5.2 Think like the user

개발 전에 사용자가 실제 서비스를 사용하는 상황을 시뮬레이션한다.

```text
User Simulation
→ Planning
→ Architecture
→ Minimum Implementation
→ Test
→ Validation
```

### 5.3 Minimum does not mean low quality

본 제품에서 MVP란 **대충 만든 Prototype을 의미하지 않는다.**

기능 범위는 좁을 수 있지만 선택된 기능은 안정적으로 동작하는 것을 목표로 한다.

> **Small scope. Reliable execution.**

### 5.4 Maintainable & collaborative code

개발 과정에서 다음을 지속적으로 확인한다.

- 다른 개발자가 이어서 개발할 수 있는가?
- 현재 아키텍처를 유지보수할 수 있는가?
- 복잡도가 실제 요구사항에 비해 과하지 않은가?
- 더 경량화할 수 있는가?

### 5.5 Trust over raw speed

빠른 개발은 중요하지만 프로젝트의 최우선 가치는 **신뢰**다.

이를 위해:

- PRD 공유
- SDD 공유
- Architecture 공유
- 명확한 Scope
- 코드 인수인계

를 기본 원칙으로 한다.

### 5.6 Security by boundaries

개발에 필요하지 않은 민감정보와 운영 권한을 요구하지 않는다.

> **If I don't need it, don't share it with me.**

권장:

- 테스트용 Credentials
- Mock/Sanitized Data
- 최소 권한 계정
- 개발용 환경

지양:

- Production DB 전체 접근
- Root/Admin Credential
- 실제 사용자 개인정보
- 운영 API Secret의 불필요한 공유

가능한 경우 운영 환경과 중요한 Credentials는 **클라이언트가 직접 소유하도록 설계한다.**

---

## 6. Core UX

Desktop 기준 화면은 기본적으로 두 영역으로 나눈다.

```text
┌─────────────────────────┬──────────────────┐
│                         │                  │
│     Portfolio           │     AI Agent     │
│     Contents            │                  │
│                         │                  │
│     Scrollable          │     Persistent   │
│                         │                  │
└─────────────────────────┴──────────────────┘
```

### Left

Portfolio Contents

### Right

Persistent AI Agent

페이지를 이동하거나 콘텐츠를 탐색해도 Agent의 대화 Context는 유지한다.

---

## 7. Information Architecture

V1 콘텐츠는 다음 순서로 구성한다.

```text
Home / Hero
↓
About
↓
What I Build
↓
How I Work
↓
Skills & Stack
↓
Experience / Case Studies
↓
Contact
```

AI Agent는 모든 영역과 연결된다.

---

## 8. Contents Specification

### 8.1 Hero

목적:

**5초 이내에 어떤 개발자인지 이해시키는 것.**

포함 정보:

- Haewon Park
- Backend / AI Agent Engineer
- Product-oriented Engineering
- Value Proposition

CTA:

- Explore My Work
- Ask My AI

### 8.2 About

단순 Biography가 아니라 **Engineering Identity**를 설명한다.

핵심 내용:

#### I build with users in mind

사용자와 제품의 실제 필요를 고려한다.

#### I care about maintainability

혼자만 이해할 수 있는 코드보다 협업 가능한 구조를 선호한다.

#### I think in trade-offs

기술적으로 가능한 것과 실제로 필요한 것을 구분한다.

#### I consider cost

제품의 가치와 무관하게 기술 복잡도를 증가시키지 않는다.

V1에서는 대학, 커리어 목표 등의 개인적 Biography는 제외한다.

추후 Easter Egg / Hidden Content 형태로 확장 가능하다.

### 8.3 What I Build

V1 서비스 범위는 두 가지를 중심으로 한다.

#### Backend API Development

예상 범위:

- REST API
- Backend Architecture
- Database Design
- Authentication / Authorization
- Cache
- External API Integration
- Backend Refactoring

#### AI Agent Development

예상 범위:

- LLM Application
- Tool-using Agent
- Agent Workflow
- RAG
- Context-aware Agent
- Multi-Agent System
- AI Automation
- Agent Backend

제공 범위:

```text
Idea Clarification
→ Scope Definition
→ Architecture
→ Development
```

지속적인 Production Operation은 기본 서비스 범위에서 제외한다.

### 8.4 How I Work

외주 개발 프로세스는 다음을 기본으로 한다.

```text
① Client Specification
        ↓
② Requirement Meeting
        ↓
③ PRD
        ↓
④ Client Review
        ↓
⑤ SDD / Architecture
        ↓
⑥ Development
        ↓
⑦ Functional Completion
        ↓
⑧ Handover
        ↓
⑨ One After-Service
```

#### Documentation Transparency

PRD 및 SDD는 완료 후 전달하는 산출물이 아니라 **작성되는 시점부터 클라이언트와 공유한다.**

목적:

- 개발 과정의 Black Box 제거
- 요구사항 오해 방지
- 아키텍처 의사결정 공유
- 인수인계 비용 감소

#### Completion Definition

프로젝트 기본 완료 조건:

- 합의된 기능 구현 완료
- 테스트 완료
- 코드 및 문서 인수인계
- 1회 사후지원

AS의 구체적인 기간/범위는 계약 단계에서 별도로 정의한다.

### 8.5 Skills & Stack — Draft

현재 기준 임시 구성.

#### Core

- Backend Engineering
- AI Agent Engineering
- LLM Application Development
- System Architecture

#### Backend

- TypeScript
- NestJS
- Python
- FastAPI
- PostgreSQL
- Redis
- REST API
- Supabase

#### AI / Agent

- OpenAI / Anthropic-compatible LLM APIs
- Tool Calling
- RAG
- Agent Orchestration
- Multi-Agent Workflow
- Context Management
- Agent Memory
- Evaluation / Tracing
- Structured Output

#### Infrastructure

- Docker
- AWS
- Vercel
- GitHub
- Basic Observability

**원칙:** 기술 로고를 많이 보여주는 것이 목적이 아니다.

Case Study를 통해 실제 사용 경험을 증명할 수 있는 기술을 우선 노출한다.

### 8.6 Experience / Case Studies — Draft

Timeline 중심이 아닌 **Problem-solving Case Study** 중심으로 구성한다.

각 Case Study Schema:

```text
Project
├── Overview
├── Problem
├── My Role
├── Constraints
├── Solution
├── Architecture
├── Key Decisions
├── Result
├── What I Learned
└── Tech Stack
```

V1 후보:

#### Fingoo

Category:

`Backend / Production Experience`

강조 가능 내용:

- Backend Architecture
- NestJS
- PostgreSQL
- Redis
- API Design
- Refactoring
- 실제 팀 협업
- 인수인계 / Architecture Documentation

#### Sentinel Club

Category:

`AI Agent / Personal Product`

강조 가능 내용:

- Agent orchestration
- Multi-agent architecture
- BYOM
- Logging / Monitoring
- Safety
- Product thinking

개발 상태는 실제 상태에 맞춰 명확하게 표기한다.

#### Perix Sentinel

Category:

`AI System / Automation`

강조 가능 내용:

- Data collection
- Scoring
- AI pipeline
- Automated reporting
- Backend pipeline

#### SCPC Agent Project

Category:

`AI Agent / Competition`

강조 가능 내용:

- Device agent
- Agent harness
- Memory
- Safety
- Planning
- Evaluation environment

### 8.7 Contact — Draft

최종 Conversion Goal:

> **Potential client starts a project conversation.**

기본 채널:

- Email
- LinkedIn
- GitHub

Primary CTA:

**Discuss Your Idea**

또는

**Build This With Me**

Agent가 이미 솔루션 상담을 진행했다면:

```text
Agent Solution
      ↓
Want to build this?
      ↓
[Discuss This Idea]
```

형태로 Contact CTA를 제공한다.

V1에서는 Agent가 사용자의 동의 없이 전체 대화를 자동 전송하지 않는다.

추후 사용자가 명시적으로 선택했을 때:

> "Include this conversation summary"

기능을 추가할 수 있다.

---

## 9. AI Agent Requirements

AI Agent는 사이트의 핵심 차별화 기능이다.

목표는 다음 명제를 직접 경험시키는 것이다.

> **An AI Agent can understand, decide and act — not only generate text.**

Agent Capability는 크게 네 가지로 구성한다.

```text
Understand
↓
Reason / Decide
↓
Act
↓
Explain
```

### 9.1 Context Awareness

Agent는 다음 Context를 활용할 수 있어야 한다.

- User Query
- Conversation History
- Current Section
- Current Case Study
- Current Page Context
- Portfolio Knowledge

예:

사용자가 Sentinel Case Study를 보고 있을 때:

> "Why did you build this?"

라고 질문하면 Sentinel을 지칭한다고 이해할 수 있어야 한다.

### 9.2 Portfolio Retrieval

Agent는 다음 데이터를 검색할 수 있다.

- About
- Skill
- Stack
- Service
- Development Philosophy
- Case Study
- Experience

검색된 정보에는 해당 콘텐츠의 위치 정보가 포함된다.

예:

```json
{
  "content": "Fingoo Backend Case Study",
  "section": "experience",
  "anchor": "fingoo"
}
```

### 9.3 Navigation Suggestion

Agent는 사용자에게 관련 콘텐츠를 제안할 수 있다.

하지만 **자동으로 화면을 이동시키지 않는다.**

예:

> I found a relevant backend project.

`View Fingoo Case Study →`

사용자가 클릭했을 때만 해당 Section으로 이동한다.

#### Rationale

지나치게 Agent 중심적인 UI는 사용자가 콘텐츠를 강제로 소비하는 느낌을 줄 수 있으며 피로도를 증가시킬 수 있다.

따라서:

> **Agent suggests. User decides.**

원칙을 따른다.

### 9.4 Solution Consultation

Agent는 잠재 클라이언트의 아이디어에 대해 간단한 Pre-sales Engineering을 수행할 수 있다.

예:

> "I want to build an AI customer support agent."

Agent Response:

```text
Goal
Automate first-line customer support

Possible MVP

Customer Question
      ↓
Knowledge Retrieval
      ↓
Support Agent
      ↓
Tool / API Call
      ↓
Human Escalation

MVP Scope
- FAQ support
- Knowledge retrieval
- basic admin knowledge update

Relevant Experience
- Sentinel
- Backend API work

[View Relevant Work]

Want to build this?
[Discuss This Idea]
```

Agent는 구현 가능성과 간단한 MVP Solution까지 제공한다.

정확한 견적이나 계약 조건은 Agent가 확정하지 않는다.

---

## 10. Chat Process X-ray

AI Agent의 실행 과정을 사용자에게 시각적으로 보여준다.

목적:

> 설명을 읽지 않아도 Agent가 어떻게 동작하는지 자연스럽게 이해시키는 것.

### 10.1 Default View

일반 사용자에게는 간단한 Pipeline만 보여준다.

```text
Understanding
↓
Finding Context
↓
Retrieving Experience
↓
Selecting Action
↓
Generating Answer
```

### 10.2 Technical Detail

사용자가 Pipeline을 클릭하면 보다 상세한 Execution Trace를 보여준다.

예:

```text
Intent
solution_consulting

Page Context
experience/sentinel

Retrieved Context
- sentinel_agent_architecture
- backend_experience
- agent_tool_calling

Actions
- generate_solution
- suggest_case_study
- offer_contact

Latency
1.8 sec
```

#### Important

Technical Detail은 **실행 정보와 시스템 행동을 보여주는 기능**이며 내부 Chain-of-Thought를 공개하는 기능이 아니다.

다음은 공개하지 않는다.

- Hidden reasoning
- System Prompt
- Secret
- API key
- 내부 보안 정책
- 민감한 모델 입력

대신 다음을 공개한다.

- Intent classification
- 사용된 Context
- Retrieval source
- Tool invocation
- Result
- Latency
- Navigation suggestion

---

## 11. Agent Tools — Draft

V1 Agent Tool 후보:

```text
search_portfolio()
get_current_page_context()
suggest_section()
get_case_study()
generate_mvp_outline()
suggest_contact()
```

중요:

`suggest_section()`은 화면을 직접 이동시키지 않는다.

결과로:

```text
{
  label: "View Backend Experience",
  target: "#experience-fingoo"
}
```

를 반환하고 실제 Navigation은 사용자 클릭 이후 Client UI에서 처리한다.

---

## 12. Security & Privacy

본 제품 자체에서도 개발 철학과 동일한 보안 원칙을 적용한다.

### AI Chat Warning

사용자에게 다음 안내를 제공한다.

> Do not share passwords, API keys, private customer data, or other sensitive information with this AI Agent.

### Chat Data

가능하면 V1에서는:

- Session 중심 처리
- 최소 로그 저장
- 민감정보 저장 지양

을 기본 정책으로 한다.

향후 Analytics 또는 Conversation 저장이 필요하면 별도의 Privacy Policy를 정의한다.

---

## 13. Functional Requirements

### FR-01

사용자는 Portfolio 콘텐츠를 Agent 없이 모두 탐색할 수 있어야 한다.

### FR-02

Agent는 사이트 전체에서 Persistent 상태를 유지해야 한다.

### FR-03

Agent는 현재 사용자가 보고 있는 Section Context를 인식할 수 있어야 한다.

### FR-04

Agent는 Portfolio Knowledge를 조회하여 답변할 수 있어야 한다.

### FR-05

Agent는 관련 콘텐츠 Navigation을 **제안**할 수 있어야 한다.

### FR-06

Navigation은 사용자의 명시적인 Action 이후 실행되어야 한다.

### FR-07

Agent는 간단한 MVP Solution을 생성할 수 있어야 한다.

### FR-08

Agent는 관련 Case Study를 Solution과 연결할 수 있어야 한다.

### FR-09

Agent Response Pipeline을 X-ray UI로 확인할 수 있어야 한다.

### FR-10

X-ray Technical Detail을 사용자가 선택적으로 확장할 수 있어야 한다.

### FR-11

Agent는 Contact CTA를 생성할 수 있어야 한다.

### FR-12

사용자는 Agent를 사용하지 않고도 Contact할 수 있어야 한다.

---

## 14. Non-functional Requirements

### Performance

Agent가 있더라도 기본 Portfolio의 초기 로딩을 크게 방해하지 않아야 한다.

### Responsive

Desktop에서는 2-column.

Mobile에서는 Agent를:

- Bottom sheet
- Floating chat
- Full-screen overlay

중 하나로 전환한다.

### Accessibility

Agent와 Portfolio 모두 keyboard navigation을 고려한다.

### Reliability

Agent 오류가 Portfolio 탐색을 막아서는 안 된다.

즉:

> **Portfolio works without the Agent.**

---

## 15. MVP Scope

### P0 — 반드시 구현

- Hero
- About
- What I Build
- How I Work
- Skills
- Case Studies
- Contact
- Persistent Agent
- Portfolio Knowledge Retrieval
- Current Page Context
- Navigation Suggestion
- Agent X-ray Basic Pipeline
- Simple Solution Consulting
- Contact CTA

### P1 — 가능하면 구현

- Technical X-ray Detail
- Agent conversation → Contact summary
- Case Study filtering
- Agent suggested questions
- Basic Analytics

### P2 — 이후

- Blog
- CMS
- Multilingual
- Authentication
- Client Dashboard
- Automatic estimate
- Payment
- Long-term conversation memory
- Personal Easter Egg contents

---

## 16. Explicit Non-goals

V1은 다음을 목표로 하지 않는다.

- 범용 AI Assistant
- 완전 자동화된 프로젝트 견적
- 계약 자동화
- 결제 시스템
- 개발 프로젝트 관리 SaaS
- 관리자 CMS
- 거대한 Agent Framework 데모
- 사용자의 모든 행동을 Agent가 제어하는 UI
- Production Infrastructure 운영 서비스

**Agent 기술 자체보다 사용자 경험과 실제 활용 가능성을 우선한다.**

---

## 17. Success Metrics

초기에는 트래픽 규모보다 **행동**을 본다.

Primary:

**Qualified Contact Conversion**

보조 지표:

- Agent interaction rate
- Average agent conversation depth
- Case Study view rate
- Agent → Case Study navigation CTR
- Agent → Contact CTA CTR
- Contact conversion
- X-ray open rate
- Technical Detail open rate

특히 재미있는 지표는:

```text
Agent Conversation
      ↓
Relevant Case Study
      ↓
Contact
```

퍼널이다.

이게 발생한다면 Agent가 단순 장식이 아니라 **실제로 고객 유입에 기여하고 있다는 증거**가 된다.

---

## 18. Product Experience Summary

사이트가 방문자에게 전달해야 할 경험은 이렇다.

```text
"이 사람 뭐 하는 개발자지?"
          ↓
"Backend + Agent구나."
          ↓
"생각보다 제품을 많이 고려하네."
          ↓
"실제로 뭘 만들었지?"
          ↓
Case Studies
          ↓
"Agent한테 내 아이디어를 물어볼까?"
          ↓
AI Consultation
          ↓
"오, 실제 Agent가 이렇게 동작하는구나."
          ↓
X-ray
          ↓
"이거 꽤 제대로 만들었네."
          ↓
"내 것도 해볼 수 있겠는데?"
          ↓
Discuss This Idea
```

---

## 19. 핵심 Product Statement

PRD 전체를 한 문장으로 줄이면:

> **Interactive AI Portfolio is a portfolio and pre-sales experience that demonstrates how I design useful AI agents by letting potential clients interact with one directly.**

그리고 개발 철학까지 넣으면:

> **Build useful systems, validate them with the smallest reliable scope, and leave clients with maintainable code they can actually own.**
