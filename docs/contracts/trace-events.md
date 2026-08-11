# Trace Event Contract

> SDD-03 D-28. This is the contract SDD-04 (패널), SDD-05 (제안 카드), SDD-06 (X-ray UI),
> and SDD-07 (MVP outline UI) consume. It mirrors `api/app/schemas/trace.py` and
> `api/app/schemas/chat.py` exactly — if the two ever disagree, the code is correct and
> this file is stale; fix this file, not the other way around.
>
> Envelope (SDD-00 §6.5): `POST /api/v1/chat` returns `text/event-stream`. Every frame is
>
> ```text
> event: <domain>.<action>
> data: {...}
> ```

## Endpoint

```text
POST /api/v1/chat
Accept: text/event-stream
Content-Type: application/json

{
  "message": "Why did you build Sentinel?",
  "session_id": "018f2c1a-6e2b-7c3a-9b1e-2f6a7d8c9e10",
  "page_context": { "section": "experience", "case_study": "perix-sentinel" }
}
```

`session_id` and `page_context` are both optional. An invalid `session_id` (not a UUID) or
a `message` outside `1..MAX_MESSAGE_CHARS` characters is rejected **before the stream
opens** — a normal `4xx` JSON response in the SDD-00 §6.6 shape, not an SSE frame, since
nothing has streamed yet at that point. `page_context` values that don't match a real
section/case_study id in the knowledge index are silently dropped, not rejected.

Everything below is an event *inside* an already-open stream. The stream always ends in
exactly one of `answer.done` or `error`.

## Event order (one turn, tools used)

```text
session
trace.step   understanding        started
trace.step   understanding        completed
trace.step   finding_context      started
trace.step   retrieving_experience started
trace.step   finding_context      completed
trace.step   retrieving_experience completed
trace.step   selecting_action     started
suggestion | answer.block                        (0..N, only if a tool produced one)
trace.step   selecting_action     completed
trace.step   generating_answer    started
answer.delta                                       (N times)
trace.step   generating_answer    completed
trace.meta
answer.done
```

`finding_context` and `retrieving_experience` are logged as an interleaved pair because
they execute concurrently (DD-14) — `retrieving_experience` starting before
`finding_context` finishes is expected, not a bug.

If the model needs no tool this turn, `selecting_action` is emitted once with
`status: "skipped"` (no `duration_ms` — see below) instead of started/completed, and
`generating_answer` covers the same span the model was already producing its answer in;
there's no second, redundant model call to "generate" that same text again.

## `session`

```json
{ "session_id": "018f2c1a-6e2b-7c3a-9b1e-2f6a7d8c9e10", "resumed": false }
```

Emitted once, immediately after the stream opens.

## `trace.step`

```json
{
  "id": "retrieval",
  "stage": "retrieving_experience",
  "status": "completed",
  "label": "Retrieving Experience",
  "started_at_ms": 88,
  "duration_ms": 142,
  "detail": {
    "result_count": 3,
    "results": [
      { "anchor": "experience-perix-sentinel-problem", "label": "Perix Sentinel — Problem", "score": 0.61 }
    ],
    "min_score": 0.3
  }
}
```

| Field | Notes |
|---|---|
| `id` | Stable per stage; a repeated `selecting_action` in round 2 uses `selecting_action:2` |
| `stage` | `understanding` \| `finding_context` \| `retrieving_experience` \| `selecting_action` \| `generating_answer` |
| `status` | `started` \| `completed` \| `skipped` \| `failed` |
| `started_at_ms` | Relative to stream start |
| `duration_ms` | **Only present when `status` is `completed` or `failed`** — never on `started`/`skipped` |
| `detail` | Shape depends on `stage`, see below. Absent on `started`/`skipped` |

### `detail` by stage

**understanding**

```json
{ "message_chars": 42, "history_turns": 3 }
```

**finding_context**

```json
{ "section": "experience", "case_study": "perix-sentinel", "resolved": true }
```

Both fields are `null` when `page_context` was absent or every value failed the
whitelist check (§3.2) — `resolved: false` in that case.

**retrieving_experience** — see example above. `result_count: 0` with `status:
"completed"` is a valid, honest outcome (DD-10): the search ran, nothing cleared
`min_score`.

**selecting_action**

```json
{
  "tools": [
    { "name": "suggest_section", "status": "ok", "duration_ms": 3 },
    { "name": "generate_mvp_outline", "status": "ok", "duration_ms": 5 }
  ],
  "round": 1
}
```

No tool arguments or return values — name, status (`ok` \| `error`), duration only.

**generating_answer**

```json
{ "model": "gpt-4o-mini", "output_tokens": 218 }
```

## `trace.meta`

```json
{ "intent": "solution_consulting" }
```

One of `solution_consulting` \| `case_study_inquiry` \| `portfolio_question` \| `general`,
derived from which tools actually ran (DD-16) — never a separate classifier call. Emitted
once, after `generating_answer` completes and before `answer.done`.

## `answer.delta`

```json
{ "text": "Sentinel은 " }
```

Zero or more per turn — each is a plain content fragment. Concatenate in order.

## `answer.block`

```json
{
  "type": "mvp_outline",
  "data": {
    "goal": "Automate on-call triage",
    "pipeline": ["ingest alerts", "classify severity", "route to owner"],
    "mvp_scope": ["Slack ingestion", "rule-based classifier"],
    "relevant_case_studies": ["perix-sentinel"],
    "caveats": ["No pricing or timeline commitment — scope only."]
  }
}
```

Only emitted from `generate_mvp_outline`. `relevant_case_studies` is pre-filtered to ids
that actually exist in the knowledge index — the model's raw argument is not trusted
as-is.

## `suggestion`

```json
{ "type": "section", "label": "View Perix Sentinel", "target": "#experience-perix-sentinel", "reason": "..." }
```

```json
{ "type": "contact", "label": "Discuss This Idea", "reason": "..." }
```

`target` on a `type: "section"` suggestion is always `#<anchor>` for an anchor the server
verified exists in the knowledge index (§4.3) — never a raw, unverified model string. The
server never navigates on its own (FR-06); the client decides whether to act on this.

## `answer.done`

```json
{ "finish_reason": "stop", "total_latency_ms": 1842 }
```

`finish_reason` is `"stop"` on a normal completion, or `"budget_exceeded"` in the rare
case the 30s request budget (`REQUEST_BUDGET_SECONDS`) ran out before the model could
even start — the visitor still gets a short apology message via `answer.delta`, not a
silent empty response.

Exactly one of `answer.done` / `error` ends the stream — never both, never neither.

## `error`

```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests. Please try again shortly.", "retry_after": 30 } }
```

Same shape as SDD-00 §6.6. `code` is one of `RATE_LIMITED` \| `INVALID_REQUEST` \|
`AGENT_FAILED` \| `UPSTREAM_UNAVAILABLE` \| `INTERNAL_ERROR`. `message` is safe to show a
user; it never contains a stack trace, the system prompt, or raw model output. This event
only appears for failures that happen **after** the stream has already opened — request
validation and rate-limit rejections at step 1-2 (§6) are plain JSON responses instead,
since no SSE frame has been sent yet at that point.

## What never appears in any event

- The system prompt text or any instruction derived from it
- Tool call arguments or raw tool return payloads (only name/status/duration)
- The client's IP address
- Stack traces or raw exception text
