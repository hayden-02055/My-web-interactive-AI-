# SDD-02 — Knowledge Index Layer

| | |
|---|---|
| **Document** | SDD-02 |
| **Title** | Knowledge Index Layer |
| **Status** | Draft |
| **Version** | v0.1 |
| **Upstream** | PRD v0.1 · SDD-00 v0.2 · SDD-01 v0.1 |
| **Author** | 박해원 |
| **Phase** | 1단계 · 기반 |
| **Covers** | FR-04(기반) |

---

## 1. Purpose

`web/src/content/`의 Markdown을 **검색 가능한 지식 인덱스**로 변환하고, 런타임 검색 인터페이스를 제공한다.

SDD-02는 Agent를 만들지 않는다. Agent가 호출할 **검색 함수 하나**를 만든다.

### 1.1 In Scope

- 청킹 전략 및 청크 식별자 체계
- 임베딩 모델 선택 및 생성 파이프라인
- `knowledge.json` 스키마
- 런타임 로딩 및 코사인 유사도 검색
- 검색 결과 계약 (SDD-03이 소비)
- 인덱스 drift 게이트 (SDD-00 §8.3 구현)

### 1.2 Out of Scope

| 항목 | 이관 |
|---|---|
| Agent 실행 루프 · tool 정의 | SDD-03 |
| Trace 이벤트 발행 | SDD-03 |
| Rate limit · Redis | SDD-03 |
| 쿼리 임베딩 캐시 | SDD-03 이후 (O-04) |
| 검색 결과의 UI 표현 | SDD-05, SDD-06 |

---

## 2. Design Decisions

### DD-06 · 2단계 파이프라인 — 파싱은 TS, 임베딩은 Python

```text
web/src/content/**/*.md
        │
        │  ① pnpm build:knowledge-source        (TypeScript)
        │     기존 SDD-01 파서 + 앵커 테이블 재사용
        ▼
  knowledge.source.json                          커밋함
        │
        │  ② uv run python scripts/build_knowledge.py   (Python)
        │     변경분만 임베딩
        ▼
  api/data/knowledge.json                        커밋함
        │
        │  ③ 서버 기동 시 메모리 로딩
        ▼
  in-memory cosine search
```

**근거 — 이게 SDD-02의 핵심 결정이다**

SDD-01은 Markdown 파서와 앵커 매핑 테이블을 **TypeScript 단일 소스**로 구현했다. Python이 같은 Markdown을 다시 파싱하면 두 개의 파서가 생기고, 앵커 테이블도 이중화된다. 그 순간 SDD-01 DD-03이 막으려던 **앵커 불일치 문제가 다른 경로로 부활한다.**

파싱을 TS 한쪽에 몰아두면 Python은 임베딩과 조립만 담당한다. 언어 경계를 가로지르는 것은 **JSON 하나**뿐이고, 이건 계약으로 검증 가능하다.

**기각안**

| 대안 | 기각 사유 |
|---|---|
| Python이 Markdown 직접 파싱 | 파서·앵커 로직 이중화 → drift 재발 |
| 임베딩까지 TS에서 수행 | 런타임(Python)과 빌드타임(TS)의 모델·차원 정합성 보장이 어려움 |
| 중간 산출물 없이 단일 스크립트 | 언어 경계상 불가능 |

**대가**

중간 산출물 1개가 늘어난다. 대신 §7의 drift 체크가 **Python·임베딩 API 없이 web CI만으로 수행 가능**해지는 이득이 있다.

### DD-07 · 청크 경계는 저자가 정한다

SDD-01 DD-02의 고정 H2 집합을 그대로 청크 경계로 사용한다. 슬라이딩 윈도우·고정 토큰 분할을 사용하지 않는다.

**청킹 규칙**

| 대상 | 청크 단위 |
|---|---|
| Section | 파일 전체 = 1청크 |
| Section (임계 초과 시) | H2 단위로 분할 |
| Case Study | H2 하나당 1청크 |
| Case Study 카드 | frontmatter 기반 요약 1청크 추가 |

**Case Study 카드 청크**

`title` · `category` · `status` · `period` · `tech` · `summary`를 합성한 청크를 개별 생성한다. 앵커는 `experience-<id>`.

> "Fingoo에서 뭐 했어요?" 같은 개괄 질문에 Architecture 절만 반환되는 것을 막는다. 개괄 질문에는 개괄 청크가 매칭되어야 한다.

**`retrievable: false`는 제외한다**

`hero`는 인덱싱하지 않는다 (SDD-01 §3.2).

### DD-08 · 임베딩은 API 기반, 모델은 build/runtime 동일

빌드 시점 문서 임베딩과 런타임 쿼리 임베딩에 **동일한 API 모델**을 사용한다. 로컬 임베딩 모델을 API 컨테이너에 탑재하지 않는다.

**근거**

쿼리 임베딩은 **런타임에 반드시 발생한다.** 이 사실이 선택을 결정한다.

| 방식 | 런타임 비용 | 컨테이너 | 쿼리 지연 |
|---|---|---|---|
| **API 모델** | API 호출 1회 | 가벼움 | +100~200ms |
| 로컬 모델 | 없음 | 모델 가중치 + torch 계열 의존성 | 콜드스타트 악화 |

Railway 컨테이너에 수백 MB 의존성을 얹으면 배포·콜드스타트가 나빠진다. 반면 추가되는 100~200ms는 **X-ray의 `Finding Context` 단계 안에 이미 표시되는 구간**이라 체감 손실이 작다.

**모델 정합성 불변식**

`knowledge.json`에 임베딩 provider·model·dimensions를 기록하고, 런타임 로딩 시 현재 설정과 대조한다. 불일치하면 **기동을 실패시킨다.** 조용히 잘못된 벡터 공간에서 검색하는 것보다 낫다.

### DD-09 · 증분 임베딩

각 청크의 `content_hash`를 비교하여 **변경된 청크만 재임베딩**한다.

**근거**

- API 비용 절감 (부차적)
- **git diff 소음 억제 (주된 이유).** 오타 하나 고쳤는데 50개 청크 벡터가 전부 바뀌면 커밋 리뷰가 불가능해진다
- 재현성: 동일 콘텐츠 → 동일 벡터

`--force` 플래그로 전체 재생성을 허용한다 (모델 변경 시 사용).

### DD-10 · 빈 결과는 정상 결과다

유사도 하한(`min_score`)을 두고, 미달 시 **빈 배열을 반환**한다. 억지로 top-k를 채우지 않는다.

**근거**

> PRD §5.5 — Trust over raw speed.
> "제 포트폴리오에 없는 내용입니다"라고 말할 수 있으려면, 검색이 "없음"을 표현할 수 있어야 한다.

무관한 질문에 최저 점수 청크를 반환하면 Agent가 그것을 근거 삼아 답하게 되고, X-ray에는 무관한 출처가 표시된다. 신뢰 훼손 경로다.

**하한값은 실측으로 정한다.** §6.3 참조.

### DD-11 · `keywords`는 별도 인덱스가 아니라 임베딩 텍스트에 포함한다

SDD-01 O-07의 결정. 어휘 검색 인덱스를 별도로 만들지 않고, `keywords`를 임베딩 대상 텍스트 앞에 문맥 헤더로 덧붙인다.

**근거**

하이브리드 검색(BM25 + 벡터)은 청크 수십 개 규모에서 이득이 거의 없고 융합 스코어링 복잡도만 늘린다. 키워드를 임베딩 텍스트에 넣으면 벡터 공간 안에서 자연스럽게 반영된다.

---

## 3. Chunk Identity & Text Composition

### 3.1 Chunk ID

청크 ID는 **앵커와 동일**하다.

```text
섹션            about
섹션 분할       about-<heading-key>
Case Study 카드 experience-fingoo
Case Study 절   experience-fingoo-architecture
```

> SDD-01 §3.5와 완전히 일치한다. ID를 별도 체계로 만들지 않는 이유는, 검색 결과가 곧바로 내비게이션 타깃이어야 하기 때문이다 (SDD-05).

### 3.2 임베딩 대상 텍스트 합성

원문만 임베딩하지 않는다. 각 청크에 **문맥 헤더**를 부착한 텍스트를 임베딩한다.

```text
[Fingoo — Architecture]
category: Backend / Production Experience
keywords: nestjs, langgraph, multi-agent

NestJS 기반 모듈 구조에서 ...
```

**근거**

`## Architecture` 본문만 떼어놓으면 "무엇의 아키텍처인지"가 사라진다. "Fingoo 아키텍처 알려줘" 쿼리가 4개 Case Study의 Architecture 절 중 어느 것과도 특별히 가깝지 않게 된다. 문맥 헤더가 이 문제를 해결한다.

**중요**: 문맥 헤더는 **임베딩 입력에만** 들어간다. `content` 필드로 반환되는 텍스트는 원문 본문이다.

---

## 4. Artifact Schemas

### 4.1 `knowledge.source.json` (TS 산출물)

```json
{
  "schema_version": 1,
  "generated_at": "2026-08-11T00:00:00Z",
  "chunks": [
    {
      "id": "experience-fingoo-architecture",
      "section": "experience",
      "anchor": "experience-fingoo-architecture",
      "label": "Fingoo — Architecture",
      "content": "NestJS 기반 모듈 구조에서 ...",
      "embed_text": "[Fingoo — Architecture]\ncategory: ...\n\nNestJS 기반 ...",
      "content_hash": "sha256:a1b2c3..."
    }
  ]
}
```

- `content_hash`는 **`embed_text`의 해시**다. 임베딩 재사용 판단 기준이므로 임베딩 입력을 해싱해야 한다
- 배치 위치: `api/data/knowledge.source.json`
- 청크는 `id` 기준 정렬하여 출력한다 (diff 안정성)

### 4.2 `knowledge.json` (Python 산출물)

```json
{
  "schema_version": 1,
  "generated_at": "2026-08-11T00:00:00Z",
  "source_schema_version": 1,
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "chunks": [
    {
      "id": "experience-fingoo-architecture",
      "section": "experience",
      "anchor": "experience-fingoo-architecture",
      "label": "Fingoo — Architecture",
      "content": "NestJS 기반 모듈 구조에서 ...",
      "content_hash": "sha256:a1b2c3...",
      "embedding": [0.012345, -0.067891, "..."]
    }
  ]
}
```

- `embed_text`는 최종 산출물에 포함하지 않는다 (파일 크기 절감, 런타임 불필요)
- 부동소수는 **소수점 6자리로 반올림**한다
- 배치 위치: `api/data/knowledge.json`

### 4.3 Size Budget

| 항목 | 예상 |
|---|---|
| 청크 수 | 40 ~ 60 |
| 벡터 1개 | 1536 × ~9 byte ≈ 14 KB |
| 전체 | **1 ~ 2 MB** |

빌드 스크립트는 산출물이 **10 MB를 초과하면 실패**한다. 콘텐츠 폭증이나 차원 설정 오류를 조기에 잡는다.

---

## 5. Build Scripts

### 5.1 `pnpm build:knowledge-source`

| | |
|---|---|
| 위치 | `web/scripts/build-knowledge-source.ts` |
| 입력 | `web/src/content/**/*.md` |
| 출력 | `api/data/knowledge.source.json` |
| 선행 | `validate:content` 통과 (V-01~V-09) |

SDD-01의 콘텐츠 로더와 앵커 매핑 테이블을 **재사용한다.** 파싱 로직을 새로 작성하지 않는다.

### 5.2 `build_knowledge.py`

| | |
|---|---|
| 위치 | `api/scripts/build_knowledge.py` |
| 입력 | `api/data/knowledge.source.json` + 기존 `knowledge.json` |
| 출력 | `api/data/knowledge.json` |

**동작**

1. source 로드, `schema_version` 확인
2. 기존 `knowledge.json` 로드 (있으면)
3. 임베딩 설정이 기존과 다르면 전체 재생성으로 전환
4. `content_hash`가 동일한 청크는 기존 벡터 재사용
5. 신규·변경 청크만 배치 임베딩
6. 삭제된 청크 제거
7. 정렬·반올림 후 기록, 요약 출력

**플래그**

| 플래그 | 동작 |
|---|---|
| `--force` | 전체 재임베딩 |
| `--check` | 생성하지 않고 drift 여부만 검사 (§7) |
| `--dry-run` | 임베딩 호출 없이 변경 계획만 출력 |

---

## 6. Runtime Retrieval

### 6.1 로딩

| | |
|---|---|
| 위치 | `api/app/knowledge/` |
| 시점 | FastAPI lifespan startup |

**기동 실패 조건 (fail fast)**

- `knowledge.json` 부재 또는 파싱 실패
- `schema_version` 불일치
- `embedding.model` / `dimensions`가 현재 설정과 불일치
- 벡터 길이가 `dimensions`와 불일치

벡터는 로딩 시 **L2 정규화하여 numpy 행렬로 상주**시킨다. 이후 코사인 유사도는 내적 한 번으로 계산된다.

### 6.2 검색 인터페이스

```python
def search(
    query: str,
    *,
    k: int = 4,
    min_score: float = MIN_SCORE,
    section: str | None = None,
) -> list[RetrievedChunk]:
    ...
```

**반환 형태**

```python
class RetrievedChunk(BaseModel):
    content: str
    section: str
    anchor: str
    label: str
    score: float
```

> PRD §9.2의 `{content, section, anchor}`를 만족하고, SDD-01 §3.6이 추가한 `label`, X-ray 표시용 `score`를 포함한다.
> **이 형태는 SDD-03이 소비하는 계약이다.** 변경 시 SDD-03 동반 개정.

**`section` 파라미터**

현재 보고 있는 섹션으로 검색 범위를 좁히는 용도. SDD-04의 page context와 연결되며, SDD-02에서는 인터페이스만 제공한다.

### 6.3 파라미터 캘리브레이션

`k`와 `min_score`는 추측하지 않고 실측으로 정한다.

**평가 셋**

`api/tests/fixtures/retrieval_cases.yaml`에 최소 15개 질의를 작성한다.

| 유형 | 개수 | 기대 |
|---|---|---|
| 명확한 질의 | 8 | 지정 앵커가 top-1 |
| 개괄 질의 | 4 | Case Study 카드 청크가 상위 |
| **무관한 질의** | 3 | **빈 결과** |

무관 질의 예: "오늘 부산 날씨", "파이썬 리스트 정렬법", "좋아하는 영화".

**결정 방법**

전체 질의의 점수 분포를 출력해, 관련 질의 최저점과 무관 질의 최고점 사이에 `min_score`를 둔다. 확정값을 본 문서 §6.4에 기입한다.

### 6.4 Calibrated Values

`scripts/calibrate_retrieval.py` 실행 결과 (2026-08-11, `text-embedding-3-small`, 콘텐츠 draft 상태 — §10.1 참조).

| 파라미터 | 값 |
|---|---|
| `k` | 4 |
| `min_score` | 0.30 |
| 관련 질의 최저 점수 | 0.3282 (specific: "어떤 기술 스택을 다루시나요?" → `skills`) |
| 무관 질의 최고 점수 | 0.2629 (irrelevant: "파이썬 리스트 정렬하는 법 알려주세요") |

**명확한 질의 8개 top-1 정확도: 4/8. top-4 포함율: 6/8.**

낮은 원인은 파이프라인이 아니라 콘텐츠다 — Case Study `Overview` 절이 다른 절(`Architecture`, `Problem` 등)의 내용을 요약 언급하고 있어, 구체 질의에서도 `Overview`가 해당 절보다 자주 상위에 랭크된다. 최초 시도에서는 모든 H2 청크에 case study의 전체 `tech` 배열을 `keywords`로 동일하게 붙였더니(§3.2) 같은 프로젝트의 청크들이 서로 지나치게 비슷해지는 문제가 있어, H2 청크의 `keywords`를 제거했다(카드 청크에는 유지) — 이 변경만으로 top-1이 3/8 → 4/8로 개선됐다.

무관 질의 3개는 모두 `min_score=0.30`에서 빈 배열을 반환한다 (DD-10 충족, §10.4 확인).

> **재캘리브레이션 필요**: §10.1의 콘텐츠 사실 검증(Sentinel Club · Perix Sentinel · SCPC Agent) 완료 후, 특히 `Overview` 절의 범위를 좁히는 내용 수정이 있다면 `scripts/calibrate_retrieval.py`를 다시 실행하고 이 표를 갱신한다.

---

## 7. Drift Gate — SDD-00 §8.3 구현

콘텐츠와 커밋된 인덱스가 어긋난 상태로 배포되는 것을 차단한다.

### 7.1 2단계 검사

**Stage A — web CI (Python·임베딩 불필요)**

```bash
pnpm validate:content
pnpm build:knowledge-source
git diff --exit-code api/data/knowledge.source.json
```

**Stage B — api CI (임베딩 호출 없음)**

```bash
uv run python scripts/build_knowledge.py --check
```

`--check`는 다음만 검사한다.

- source의 청크 ID 집합 == knowledge의 청크 ID 집합
- 각 청크의 `content_hash` 일치
- `embedding` 메타가 현재 설정과 일치

**근거**

DD-06의 2단계 구조 덕분에 **어느 단계에서도 임베딩 API를 호출하지 않고 drift를 잡을 수 있다.** CI에 임베딩 키를 주입할 필요가 없고, 비용과 비결정성이 모두 제거된다.

### 7.2 개발자 워크플로

```bash
# 콘텐츠 수정 후
pnpm validate:content
pnpm build:knowledge-source
uv run python scripts/build_knowledge.py     # 변경분만 임베딩
git add web/src/content api/data
```

이 절차를 `docs/conventions.md`에 기록한다.

---

## 8. Security

- 임베딩 API 키는 백엔드 환경변수로만 존재한다 (INV-06)
- `knowledge.json`은 공개 저장소에 커밋되므로 **비공개 정보를 콘텐츠에 넣지 않는다.** 콘텐츠는 어차피 공개 사이트에 렌더링되므로 추가 노출은 없으나, 원칙을 명시한다
- 빌드 스크립트는 런타임 경로에 포함되지 않는다

**추가 환경변수** (SDD-00 §6.7 개정)

```bash
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
KNOWLEDGE_INDEX_PATH=data/knowledge.json
RETRIEVAL_TOP_K=4
RETRIEVAL_MIN_SCORE=
```

---

## 9. Deliverables

| # | 산출물 |
|---|---|
| D-11 | `build-knowledge-source.ts` + `pnpm build:knowledge-source` |
| D-12 | `knowledge.source.json` 스키마 및 산출물 |
| D-13 | `build_knowledge.py` (증분 · `--force` · `--check` · `--dry-run`) |
| D-14 | `knowledge.json` 산출물 |
| D-15 | `app/knowledge/` 로더 + fail-fast 검증 |
| D-16 | `search()` 구현 및 `RetrievedChunk` 스키마 |
| D-17 | `retrieval_cases.yaml` 평가 셋 (15+) |
| D-18 | 캘리브레이션 리포트 + §6.4 기입 |
| D-19 | CI drift 게이트 2단계 |
| D-20 | `.env.example` · `conventions.md` 갱신 |

---

## 10. Definition of Done

### 10.1 콘텐츠 선결 조건

- [ ] **Sentinel Club · Perix Sentinel · SCPC Agent 본문 사실 검증 완료** — 초안 상태 인덱싱 금지
- [ ] 3개 Case Study의 `status` 값이 실제 개발 상태와 일치
- [ ] `contact.md`의 LinkedIn · GitHub TODO 실제 링크로 교체

> 인덱싱은 콘텐츠를 **Agent가 사실로 단언할 근거**로 승격시킨다. 미검증 내용이 X-ray 출처와 함께 제시되면 오히려 더 신뢰성 있게 보이며, 이는 PRD §5.5의 직접 위반이다.

### 10.2 파이프라인

- [ ] `pnpm build:knowledge-source` 성공, 청크 수·구성이 §2 DD-07과 일치
- [ ] `hero`가 인덱스에 없음 확인
- [ ] Case Study마다 카드 청크 1개 + 절 청크 N개 생성 확인
- [ ] `build_knowledge.py` 성공, 산출물 10 MB 이하
- [ ] 콘텐츠 1개 문장 수정 → 재실행 시 **해당 청크만 벡터 변경** (git diff로 확인)
- [ ] `--force` 전체 재생성 동작
- [ ] 청크 ID == 앵커임을 SDD-01 렌더링 결과와 대조 확인

### 10.3 런타임

- [ ] 서버 기동 시 인덱스 로딩, 청크 수 로그 출력
- [ ] `knowledge.json` 제거 시 기동 실패 확인
- [ ] `EMBEDDING_MODEL` 변경 시 기동 실패 확인
- [ ] `search()` 정상 동작, `RetrievedChunk` 형태 일치

### 10.4 검색 품질

- [ ] 평가 셋 15개 이상 작성
- [ ] 명확한 질의 8개 중 top-1 정확도 기록
- [ ] 무관한 질의 3개가 **빈 결과** 반환 (DD-10)
- [ ] §6.4 캘리브레이션 값 기입

### 10.5 게이트 · 회귀

- [ ] Stage A / Stage B drift 검사 통과
- [ ] 콘텐츠만 수정하고 인덱스 미갱신 시 **CI 실패 확인**
- [ ] `ruff` · `mypy` · `pytest` 통과
- [ ] **백엔드 미기동 상태에서 포트폴리오 정상 동작** (INV-01 회귀 확인)

---

## 11. Traceability

| 요구 | 대응 |
|---|---|
| FR-04 | §6 — 검색 기반 제공 |
| PRD §9.2 | §6.2 — `{content, section, anchor}` |
| PRD §5.5 | DD-10, §10.1 |
| AD-03 | 전체 — 벡터 DB 없는 semantic retrieval |
| AD-07 | §5, §7 — 커밋된 빌드 산출물 |
| INV-03 | DD-06 — 콘텐츠 단일 소스에서만 파생 |
| INV-05 | §6.2 `score` — 실제 검색 결과 노출 |
| INV-06 | §8 |
| SDD-00 §8.3 | §7 |
| SDD-01 DD-02 | DD-07 — 고정 H2 = 청크 경계 |
| SDD-01 DD-03 | DD-06 — 앵커 로직 단일화 |
| SDD-01 O-07 | DD-11 |

---

## 12. Open Items

| # | 항목 | 시점 |
|---|---|---|
| O-09 | 쿼리 임베딩 Redis 캐시 | SDD-03 이후 |
| O-10 | 차원 축소로 산출물 경량화 | 크기 문제 발생 시 |
| O-11 | `section` 필터의 실제 적용 정책 | SDD-04 |
| O-12 | 검색 품질 회귀 테스트 CI 편입 | 평가 셋 안정화 후 |

---

## 13. Revision History

| 버전 | 일자 | 변경 |
|---|---|---|
| v0.1 | 2026-08-11 | 최초 작성 |
