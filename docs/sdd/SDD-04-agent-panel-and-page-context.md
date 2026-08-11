# SDD-04 — Persistent Agent Panel & Page Context

| | |
|---|---|
| **Document** | SDD-04 |
| **Title** | Persistent Agent Panel & Page Context |
| **Status** | Draft |
| **Version** | v0.1 |
| **Upstream** | PRD v0.1 · SDD-00 v0.2 · SDD-01 v0.1 · SDD-02 v0.1 · SDD-03 v0.1 |
| **Author** | 박해원 |
| **Phase** | 2단계 · 에이전트 |
| **Covers** | FR-02, FR-03, FR-04(클라이언트) |

---

## 1. Purpose

SDD-01의 Agent 슬롯 placeholder를 **동작하는 대화 패널**로 교체하고, SDD-03의 trace 계약을 소비하는 **클라이언트 상태 모델**을 확립한다.

SDD-04의 진짜 산출물은 UI가 아니라 **상태 모델**이다. SDD-05·06·07은 이 상태를 렌더링만 한다.

### 1.1 In Scope

- SSE 클라이언트 및 이벤트 파서
- Agent 대화 상태 모델 (trace 계약 미러)
- 섹션 감지 및 page context 산출
- 패널 셸 · 메시지 목록 · 입력창
- degraded 모드 및 오류 처리
- 세션 지속 (새로고침 복원)
- O-02 · O-08 · O-11 결정

### 1.2 Out of Scope

| 항목 | 이관 |
|---|---|
| 제안 카드 렌더링 및 이동 실행 | SDD-05 |
| X-ray 시각화 | SDD-06 |
| MVP outline 블록 렌더링 | SDD-07 |
| 모바일 전환 셸 | SDD-09 |
| 키보드 내비게이션 전반 | SDD-09 |

---

## 2. Design Decisions

### DD-18 · SSE는 `EventSource`가 아니라 `fetch` + `ReadableStream`으로 수신한다

**근거**

`EventSource`는 **GET만 지원**한다. SDD-03의 `/api/v1/chat`은 POST이며 body에 메시지·세션·page context를 담는다. 쿼리스트링으로 우회하면 다음이 깨진다.

- 메시지 길이 제한
- **개인정보를 URL 파라미터에 싣지 않는다**는 원칙 위반
- 로그·리퍼러에 대화 내용 노출

따라서 `fetch(POST)` → `response.body.getReader()` → 수동 SSE 파싱을 구현한다.

**대가**

프레임 경계 버퍼링, 부분 청크 처리, 종료 감지를 직접 구현해야 한다. `lib/agent/sseClient.ts`에 격리하여 테스트 대상으로 삼는다.

**자동 재연결 없음**

`EventSource`의 자동 재연결도 함께 포기한다. 이는 오히려 바람직하다 — POST 요청은 멱등하지 않아, 자동 재시도는 **중복 LLM 호출과 이중 과금**을 유발한다. DD-24로 처리한다.

### DD-19 · 클라이언트 상태 모델은 SDD-04가 소유한다

trace 이벤트를 파싱해 누적하는 상태 모델을 SDD-04에서 확정하고, 이후 SDD는 **렌더링만** 담당한다.

```text
SSE 이벤트 ─→ [SDD-04] 상태 모델 ─┬─→ [SDD-05] 제안 카드
                                  ├─→ [SDD-06] X-ray
                                  └─→ [SDD-07] MVP outline 블록
```

**근거**

세 개의 SDD가 각자 SSE를 구독하면 파서가 셋이 되고, 이벤트 순서·부분 상태 처리가 제각각이 된다. 상태를 한 곳에서 만들고 아래로 흘리면 SDD-05·06·07은 순수 표현 계층이 되어 **백엔드 없이도 목 데이터로 개발 가능**해진다.

### DD-20 · Page context는 전송 시점 스냅샷으로 고정한다 (O-02 결정)

메시지를 전송하는 순간의 섹션 값을 캡처하여 요청에 담고, **스트리밍 중 스크롤이 바뀌어도 갱신하지 않는다.**

**근거**

- 요청은 이미 전송되었으므로 갱신해도 서버 동작에 영향을 줄 수 없다
- X-ray의 `finding_context`는 **그 요청이 실제로 사용한 컨텍스트**를 표시해야 한다. 현재 스크롤 위치를 표시하면 실행과 표시가 어긋나 INV-05 위반이다
- 사용자 메시지에 스냅샷을 함께 보관하여, 나중에 대화를 되돌아볼 때 "그때 어디를 보고 있었는지"가 유지된다

**기각안**

| 대안 | 기각 사유 |
|---|---|
| 스트리밍 중 실시간 갱신 | 표시와 실행 불일치 |
| 전송 직전이 아닌 입력 시작 시점 캡처 | 입력 중 스크롤한 사용자의 의도와 어긋남 |

### DD-21 · 섹션 감지는 단일 소스에서 산출한다 (O-08 결정)

`IntersectionObserver` 기반 감지기를 하나만 두고, 그 결과를 **page context와 내비게이션 하이라이트가 공유**한다.

**감지 규칙**

| 항목 | 정책 |
|---|---|
| 관측 대상 | 섹션 요소 + Case Study 요소 |
| 활성 판정 | 뷰포트 상단 밴드(`rootMargin`으로 정의) 내 교차 |
| 다중 교차 | 교차 비율 최대값 → 동률 시 문서 순서 우선 |
| 중첩 | Case Study 활성 시 `{section: "experience", case_study: id}` |
| 변경 반영 | 값이 실제로 바뀔 때만 커밋 |

**근거**

내비게이션 하이라이트와 page context가 서로 다른 감지기를 쓰면, 화면에 표시된 현재 위치와 Agent가 인식한 위치가 어긋난다. 사용자는 이를 즉시 알아챈다.

**성능 제약**

관측 콜백에서 매번 상태를 갱신하면 스크롤 중 리렌더가 폭증한다. 값이 변할 때만 커밋하고, 구독자는 필요한 부분만 읽는다. INV-02에 따라 이 경로는 네트워크를 타지 않는다.

### DD-22 · Degraded 모드는 능동 폴링 없이 실패로 진입한다

백엔드 헬스체크를 주기적으로 호출하지 않는다. **첫 요청이 실패했을 때** degraded 상태로 전환한다.

**근거**

- 폴링은 방문자 전원에게 불필요한 트래픽을 만든다. 대부분의 방문자는 Agent를 쓰지 않는다
- INV-01에 따라 백엔드 상태는 포트폴리오에 아무 영향이 없다. **미리 알 필요가 없다**
- 초기 로딩에 API 왕복을 추가하지 않는다 (PRD §14 Performance)

**표시**

패널 내부에만 안내를 표시한다. 포트폴리오 영역은 어떤 변화도 겪지 않는다. 재시도 버튼으로 복귀를 시도한다.

### DD-23 · 세션은 `sessionStorage`에 보관한다

| 저장 항목 | 위치 |
|---|---|
| `session_id` | `sessionStorage` |
| 대화 트랜스크립트 | `sessionStorage` |
| 서버측 히스토리 | Redis (SDD-03 §8) |

**근거**

- 새로고침 시 대화가 사라지는 것은 명백한 UX 결함이다
- `localStorage`가 아닌 `sessionStorage`를 쓰는 이유: 탭을 닫으면 정리되어 **PRD §12의 "Session 중심 처리, 민감정보 저장 지양"** 에 부합한다
- 히스토리 조회 엔드포인트를 새로 만들지 않는다. 클라이언트가 자기 트랜스크립트를 갖고 있으면 충분하다

**복원 정책**

- 저장된 `session_id`가 있으면 요청에 포함한다. Redis TTL(60분) 만료 시 서버가 새 세션을 발급하고 `session` 이벤트로 통지한다
- 서버가 새 세션을 발급하면 클라이언트는 트랜스크립트를 유지하되, **컨텍스트가 초기화되었음을 안내**한다
- 저장 상한을 두어 용량 초과를 방지한다

### DD-24 · 자동 재시도를 하지 않는다

스트림 실패 시 자동 재요청하지 않는다. 사용자에게 재시도 버튼을 제공한다.

**근거**

`/api/v1/chat`은 멱등하지 않다. 자동 재시도는 LLM 호출을 중복시켜 **rate limit 소모와 비용을 두 배로** 만든다. SDD-03이 예산 상한을 세운 것과 같은 취지다.

`RATE_LIMITED` 응답은 재시도 버튼을 `retry_after` 동안 비활성화한다.

### DD-25 · 검색을 page context로 자동 필터링하지 않는다 (O-11 결정)

page context는 프롬프트에 주입될 뿐, SDD-02 `search()`의 `section` 인자로 자동 전달되지 않는다.

**근거**

"Fingoo 보다가 다른 백엔드 사례 있어요?"처럼 **현재 섹션 밖의 답을 원하는 질문**이 흔하다. 하드 필터링하면 이런 질문이 구조적으로 실패한다.

`section` 인자는 모델이 `search_portfolio` tool로 필요할 때 명시적으로 사용한다. 판단을 모델에게 남기는 편이 정확하다.

---

## 3. Client State Model

> SDD-03 §5 이벤트 계약의 클라이언트 미러다. `web/src/lib/agent/types.ts`에 정의한다.

### 3.1 대화 상태

```ts
type AgentStatus = 'idle' | 'streaming' | 'error' | 'degraded';

type PageContextSnapshot = {
  section: string | null;
  caseStudy: string | null;
};

type UserMessage = {
  id: string;
  role: 'user';
  text: string;
  pageContext: PageContextSnapshot;   // DD-20 스냅샷
  createdAt: number;
};

type AssistantMessage = {
  id: string;
  role: 'assistant';
  status: 'streaming' | 'done' | 'error';
  text: string;                        // answer.delta 누적
  blocks: AnswerBlock[];               // answer.block        → SDD-07
  suggestions: Suggestion[];           // suggestion          → SDD-05
  trace: TraceStep[];                  // trace.step          → SDD-06
  intent: string | null;               // trace.meta
  latencyMs: number | null;            // answer.done
  error: AgentError | null;            // error
};

type AgentState = {
  status: AgentStatus;
  sessionId: string | null;
  messages: (UserMessage | AssistantMessage)[];
  contextReset: boolean;               // DD-23 세션 만료 안내
};
```

`TraceStep` · `Suggestion` · `AnswerBlock` · `AgentError`는 SDD-03 §5의 페이로드를 그대로 미러링한다. 필드를 임의로 축약하지 않는다.

### 3.2 이벤트 → 상태 반영

| 이벤트 | 반영 |
|---|---|
| `session` | `sessionId` 저장. 기존과 다르면 `contextReset = true` |
| `trace.step` | 동일 `id` 존재 시 갱신, 없으면 추가 |
| `trace.meta` | `intent` 설정 |
| `answer.delta` | `text` 누적 |
| `answer.block` | `blocks` 추가 |
| `suggestion` | `suggestions` 추가 |
| `answer.done` | `status = 'done'`, `latencyMs` 설정 |
| `error` | `status = 'error'`, `error` 설정 |

**`trace.step`의 갱신 규칙이 중요하다.** `started` → `completed`로 두 번 발행되므로, 같은 `id`는 배열에 중복 추가하지 않고 제자리 갱신한다. SDD-06이 진행 중 단계를 표현할 수 있게 하기 위함이다.

### 3.3 알 수 없는 이벤트

미지의 `event` 이름은 **무시하고 계속 진행**한다. 오류로 처리하지 않는다.

**근거**

백엔드가 새 이벤트를 추가했을 때 구버전 클라이언트가 대화 전체를 실패시키면 안 된다. 계약을 전방 호환으로 유지한다.

---

## 4. SSE Client

### 4.1 위치

```text
web/src/lib/agent/
├── sseClient.ts      # fetch + ReadableStream + 프레임 파서
├── types.ts          # 상태 모델 · 이벤트 타입
└── reducer.ts        # 이벤트 → 상태 전이
```

### 4.2 요구 동작

| # | 동작 |
|---|---|
| C-01 | POST + `Accept: text/event-stream` |
| C-02 | 청크 경계와 무관하게 프레임(`\n\n`) 단위로 파싱 |
| C-03 | `event:` 없는 프레임은 무시 |
| C-04 | `data:` 다중 라인 결합 |
| C-05 | 비-200 응답은 **SSE가 아닌 JSON 오류 봉투**로 파싱 (SDD-00 §6.6) |
| C-06 | `AbortController`로 중단 지원 (Stop 버튼 · 언마운트) |
| C-07 | 무이벤트 유휴 타임아웃 초과 시 중단 후 오류 처리 |
| C-08 | 스트림이 `answer.done`/`error` 없이 끊기면 오류로 마감 |

**C-05가 특히 중요하다.** rate limit 초과(429)는 SSE가 아니라 JSON 본문으로 온다. 이 분기를 놓치면 파서가 조용히 실패하고 사용자는 아무 피드백도 받지 못한다.

**C-08의 이유**: 네트워크 단절 시 스트림이 정상 종료처럼 보일 수 있다. 종료 이벤트 수신 여부를 명시적으로 추적한다.

### 4.3 재사용성

`sseClient`는 React에 의존하지 않는 순수 모듈로 작성한다. 목 스트림으로 단위 테스트하며, 백엔드 없이 SDD-05·06·07 개발에 사용한다.

---

## 5. Page Context

### 5.1 구성

```text
web/src/lib/page-context/
├── observer.ts         # IntersectionObserver 감지기
└── store.ts            # 현재 값 보관 + 구독
```

### 5.2 산출 값

```ts
{ section: 'experience', caseStudy: 'fingoo' }
{ section: 'about',      caseStudy: null }
{ section: null,         caseStudy: null }   // 판정 불가
```

- 값은 SDD-01의 콘텐츠 ID와 동일하다. 별도 매핑을 만들지 않는다
- SDD-03 §3.2의 화이트리스트 검증과 자연히 일치한다

### 5.3 소비처

| 소비처 | 용도 |
|---|---|
| 메시지 전송 | 전송 시점 스냅샷 (DD-20) |
| 섹션 내비게이션 | 현재 위치 하이라이트 (DD-21) |

---

## 6. Panel UI

### 6.1 구성

```text
web/src/components/agent/
├── AgentPanel.tsx        # 셸 · 상태 분기
├── AgentProvider.tsx     # 상태 · 전송 액션 제공
├── MessageList.tsx
├── MessageItem.tsx
├── Composer.tsx          # 입력 · 전송 · Stop
├── ChatWarning.tsx       # PRD §12
└── DegradedNotice.tsx
```

> SDD-00 §6.3 — `agent`와 `portfolio`는 서로 import하지 않는다. page context store는 `lib/`에 있으므로 양쪽이 참조해도 위배가 아니다.

### 6.2 셸 요구사항

| # | 요구 |
|---|---|
| U-01 | SDD-01에서 확정한 슬롯 치수를 변경하지 않는다 |
| U-02 | 메시지 목록은 자체 스크롤. 포트폴리오 스크롤과 독립 |
| U-03 | 스트리밍 중 하단 고정, 사용자가 위로 스크롤하면 고정 해제 |
| U-04 | 입력창은 전송 중 비활성, Stop 버튼 노출 |
| U-05 | Chat Warning 상시 노출 (PRD §12 · SDD-00 §7.3) |
| U-06 | 스트리밍 텍스트는 `aria-live="polite"` 영역에 렌더 |
| U-07 | 상태 로직은 레이아웃과 분리 — SDD-09가 셸만 교체 가능해야 함 |

**U-07의 이유**: 모바일 전환(bottom sheet 등)은 SDD-09에서 결정된다. 상태와 셸이 얽히면 그때 재작성이 발생한다.

### 6.3 이번 SDD에서 렌더링하지 않는 것

`trace` · `suggestions` · `blocks`는 **상태에는 수집하되 최종 UI로 렌더링하지 않는다.**

검증을 위해 개발 전용 디버그 뷰를 플래그 뒤에 둔다. 프로덕션 번들에 포함하지 않으며, 임시 UI를 만들어 SDD-05·06·07에서 폐기하는 일을 피한다.

---

## 7. Error Handling

| 상황 | 표시 | 재시도 |
|---|---|---|
| 네트워크 실패 · 백엔드 중단 | degraded 안내 | 버튼 |
| `RATE_LIMITED` | 안내 + 대기 시간 | `retry_after` 후 활성화 |
| `UPSTREAM_UNAVAILABLE` | 일시 이용 불가 안내 | 버튼 |
| `INVALID_REQUEST` | 입력 문제 안내 | 입력 수정 |
| `AGENT_FAILED` · `INTERNAL_ERROR` | 일반 오류 안내 | 버튼 |
| 유휴 타임아웃 · 비정상 종료 | 응답 중단 안내, 부분 텍스트 유지 | 버튼 |

**모든 경우에 포트폴리오는 영향을 받지 않는다** (INV-01).

오류 메시지는 서버가 준 `message`를 사용하되, 없으면 코드별 기본 문구를 쓴다. 스택 트레이스·내부 식별자를 노출하지 않는다.

---

## 8. Deliverables

| # | 산출물 |
|---|---|
| D-31 | `lib/agent/types.ts` — 상태 모델 (SDD-03 §5 미러) |
| D-32 | `lib/agent/sseClient.ts` — C-01~C-08 |
| D-33 | `lib/agent/reducer.ts` — 이벤트 전이 |
| D-34 | `lib/page-context/` — 감지기 + 스토어 |
| D-35 | `AgentProvider` — 상태 · 전송 · 중단 |
| D-36 | 패널 UI 컴포넌트 일습 |
| D-37 | 세션 지속 (DD-23) |
| D-38 | 오류 · degraded 처리 |
| D-39 | 내비게이션 하이라이트 연결 (O-08) |
| D-40 | `sseClient` · `reducer` 단위 테스트 (목 스트림) |

---

## 9. Definition of Done

### 9.1 스트리밍

- [ ] 질문 전송 → 토큰이 점진적으로 표시됨
- [ ] 청크가 프레임 중간에서 잘리는 목 스트림으로 파서 검증
- [ ] `trace.step`의 `started` → `completed`가 **중복 항목 없이 제자리 갱신**
- [ ] `suggestion` · `answer.block`이 상태에 수집됨 (디버그 뷰로 확인)
- [ ] 미지 이벤트 주입 시 대화가 계속 진행됨 (§3.3)
- [ ] Stop 버튼으로 중단, 부분 텍스트 유지

### 9.2 Page Context

- [ ] 스크롤에 따라 현재 섹션이 정확히 갱신
- [ ] Case Study 열람 시 `{section: 'experience', case_study: id}` 산출
- [ ] **전송 시점 스냅샷 고정** — 스트리밍 중 스크롤해도 요청·표시 값 불변 (DD-20)
- [ ] 내비게이션 하이라이트와 Agent 인식 위치가 항상 일치 (DD-21)
- [ ] 스크롤 중 과도한 리렌더 없음 (프로파일러 확인)
- [ ] **스크롤·감지 경로에서 네트워크 요청 0회** (INV-02)

### 9.3 세션

- [ ] 새로고침 후 대화 복원
- [ ] 서버가 새 `session_id` 발급 시 컨텍스트 초기화 안내 표시
- [ ] 새 탭에서 별도 세션으로 시작
- [ ] 저장 상한 초과 시 안전하게 절삭

### 9.4 오류 · 격리

- [ ] 백엔드 중단 상태에서 전송 → degraded 안내, **포트폴리오 정상 동작** (INV-01)
- [ ] 429 JSON 응답이 오류로 정확히 처리됨 (C-05)
- [ ] `retry_after` 동안 재시도 비활성화
- [ ] 스트림 강제 절단 시 부분 텍스트 유지 + 오류 표시 (C-08)
- [ ] **자동 재요청이 발생하지 않음** — 네트워크 탭으로 확인 (DD-24)

### 9.5 회귀

- [ ] `validate:content` · `lint` · `typecheck` · `build` 통과
- [ ] 모바일 뷰포트에서 SDD-01과 동일하게 패널 미표시
- [ ] 콘솔 오류 없음

---

## 10. Traceability

| 요구 | 대응 |
|---|---|
| FR-02 | DD-23, SDD-01 DD-01 — 단일 라우트로 언마운트 없음 |
| FR-03 | §5, DD-20, DD-21 |
| FR-04 | §4, §3.2 |
| PRD §9.1 | §5.2 |
| PRD §12 | U-05, DD-23 |
| PRD §14 Performance | DD-22 — 초기 로딩에 API 왕복 없음 |
| PRD §14 Reliability | §7, DD-22 |
| INV-01 | DD-22, §7, DoD 9.4 |
| INV-02 | DD-21, DoD 9.2 |
| INV-04 | §6.3 — 제안을 수집만 하고 이동하지 않음 |
| INV-05 | DD-20 — 실행 시점 컨텍스트 보존 |
| SDD-03 §5 | §3.1, §3.2 |
| O-02 | DD-20 |
| O-08 | DD-21, D-39 |
| O-11 | DD-25 |

---

## 11. Open Items

| # | 항목 | 시점 |
|---|---|---|
| O-18 | 추천 질문 프롬프트 노출 여부 | SDD-05 |
| O-19 | 대화 초기화 버튼 제공 여부 | SDD-09 |
| O-20 | 스트리밍 중 입력 큐잉 정책 | 필요 시 |

---

## 12. Revision History

| 버전 | 일자 | 변경 |
|---|---|---|
| v0.1 | 2026-08-11 | 최초 작성 |
| v0.2 | 2026-08-11 | 구현 완료 — D-31~D-40. 실제 백엔드(SDD-03)와 브라우저로 스트리밍·page context·세션 복원 라이브 검증. 상세는 `PROGRESS.md` 참고 |
