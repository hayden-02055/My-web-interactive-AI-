import type { ChatSseEvent } from "./types";

// SDD-05/06/07 §4.1 DD-34 / D-51 — the six render scenarios the spec calls
// out. F-05 and F-06 describe states the real backend structurally can't
// produce (it validates anchors before ever emitting a suggestion, and a
// stream only ends one documented way) — these fixtures are the only way
// to exercise those paths at all, live backend or not.

/** F-01 — search succeeds, model answers, and proposes a relevant section. */
export const FIXTURE_SEARCH_SUCCESS: ChatSseEvent[] = [
  { event: "session", data: { session_id: "fixture-f01", resumed: false } },
  { event: "trace.step", data: { id: "understanding", stage: "understanding", status: "started", label: "Understanding", started_at_ms: 0 } },
  {
    event: "trace.step",
    data: {
      id: "understanding",
      stage: "understanding",
      status: "completed",
      label: "Understanding",
      started_at_ms: 0,
      duration_ms: 1,
      detail: { message_chars: 32, history_turns: 0 },
    },
  },
  { event: "trace.step", data: { id: "finding_context", stage: "finding_context", status: "started", label: "Finding Context", started_at_ms: 1 } },
  { event: "trace.step", data: { id: "retrieval", stage: "retrieving_experience", status: "started", label: "Retrieving Experience", started_at_ms: 1 } },
  {
    event: "trace.step",
    data: {
      id: "finding_context",
      stage: "finding_context",
      status: "completed",
      label: "Finding Context",
      started_at_ms: 1,
      duration_ms: 50,
      detail: { section: null, case_study: null, resolved: false },
    },
  },
  {
    event: "trace.step",
    data: {
      id: "retrieval",
      stage: "retrieving_experience",
      status: "completed",
      label: "Retrieving Experience",
      started_at_ms: 1,
      duration_ms: 120,
      detail: { result_count: 1, results: [{ anchor: "experience-fingoo", label: "Fingoo", score: 0.61 }], min_score: 0.3 },
    },
  },
  { event: "trace.step", data: { id: "selecting_action", stage: "selecting_action", status: "started", label: "Selecting Action", started_at_ms: 121 } },
  { event: "suggestion", data: { type: "section", label: "View Fingoo Case Study", target: "#experience-fingoo", reason: "Directly relevant backend architecture" } },
  {
    event: "trace.step",
    data: {
      id: "selecting_action",
      stage: "selecting_action",
      status: "completed",
      label: "Selecting Action",
      started_at_ms: 121,
      duration_ms: 5,
      detail: { tools: [{ name: "suggest_section", status: "ok", duration_ms: 3 }], round: 1 },
    },
  },
  { event: "trace.step", data: { id: "generating_answer", stage: "generating_answer", status: "started", label: "Generating Answer", started_at_ms: 126 } },
  { event: "answer.delta", data: { text: "Fingoo automates " } },
  { event: "answer.delta", data: { text: "financial reconciliation for its users." } },
  {
    event: "trace.step",
    data: {
      id: "generating_answer",
      stage: "generating_answer",
      status: "completed",
      label: "Generating Answer",
      started_at_ms: 126,
      duration_ms: 900,
      detail: { model: "gpt-4o-mini", output_tokens: 24 },
    },
  },
  { event: "trace.meta", data: { intent: "portfolio_question" } },
  { event: "answer.done", data: { finish_reason: "stop", total_latency_ms: 1030 } },
];

/** F-02 — search runs but nothing clears the relevance threshold (DD-10). */
export const FIXTURE_ZERO_RESULTS: ChatSseEvent[] = [
  { event: "session", data: { session_id: "fixture-f02", resumed: false } },
  { event: "trace.step", data: { id: "understanding", stage: "understanding", status: "started", label: "Understanding", started_at_ms: 0 } },
  {
    event: "trace.step",
    data: { id: "understanding", stage: "understanding", status: "completed", label: "Understanding", started_at_ms: 0, duration_ms: 1, detail: { message_chars: 28, history_turns: 0 } },
  },
  { event: "trace.step", data: { id: "finding_context", stage: "finding_context", status: "started", label: "Finding Context", started_at_ms: 1 } },
  { event: "trace.step", data: { id: "retrieval", stage: "retrieving_experience", status: "started", label: "Retrieving Experience", started_at_ms: 1 } },
  {
    event: "trace.step",
    data: { id: "finding_context", stage: "finding_context", status: "completed", label: "Finding Context", started_at_ms: 1, duration_ms: 40, detail: { section: null, case_study: null, resolved: false } },
  },
  {
    event: "trace.step",
    data: { id: "retrieval", stage: "retrieving_experience", status: "completed", label: "Retrieving Experience", started_at_ms: 1, duration_ms: 110, detail: { result_count: 0, results: [], min_score: 0.3 } },
  },
  { event: "trace.step", data: { id: "selecting_action", stage: "selecting_action", status: "skipped", label: "Selecting Action", started_at_ms: 111 } },
  { event: "trace.step", data: { id: "generating_answer", stage: "generating_answer", status: "started", label: "Generating Answer", started_at_ms: 111 } },
  { event: "answer.delta", data: { text: "I don't have information on that." } },
  {
    event: "trace.step",
    data: { id: "generating_answer", stage: "generating_answer", status: "completed", label: "Generating Answer", started_at_ms: 111, duration_ms: 400, detail: { model: "gpt-4o-mini", output_tokens: 9 } },
  },
  { event: "trace.meta", data: { intent: "general" } },
  { event: "answer.done", data: { finish_reason: "stop", total_latency_ms: 520 } },
];

/** F-03 — MVP consulting: an outline block, two Case Study links, and a contact suggestion. */
export const FIXTURE_MVP_OUTLINE: ChatSseEvent[] = [
  { event: "session", data: { session_id: "fixture-f03", resumed: false } },
  { event: "trace.step", data: { id: "understanding", stage: "understanding", status: "started", label: "Understanding", started_at_ms: 0 } },
  {
    event: "trace.step",
    data: { id: "understanding", stage: "understanding", status: "completed", label: "Understanding", started_at_ms: 0, duration_ms: 1, detail: { message_chars: 90, history_turns: 0 } },
  },
  { event: "trace.step", data: { id: "finding_context", stage: "finding_context", status: "started", label: "Finding Context", started_at_ms: 1 } },
  { event: "trace.step", data: { id: "retrieval", stage: "retrieving_experience", status: "started", label: "Retrieving Experience", started_at_ms: 1 } },
  {
    event: "trace.step",
    data: { id: "finding_context", stage: "finding_context", status: "completed", label: "Finding Context", started_at_ms: 1, duration_ms: 60, detail: { section: null, case_study: null, resolved: false } },
  },
  {
    event: "trace.step",
    data: {
      id: "retrieval",
      stage: "retrieving_experience",
      status: "completed",
      label: "Retrieving Experience",
      started_at_ms: 1,
      duration_ms: 140,
      detail: {
        result_count: 2,
        results: [
          { anchor: "experience-fingoo", label: "Fingoo", score: 0.55 },
          { anchor: "experience-perix-sentinel", label: "Perix Sentinel", score: 0.5 },
        ],
        min_score: 0.3,
      },
    },
  },
  { event: "trace.step", data: { id: "selecting_action", stage: "selecting_action", status: "started", label: "Selecting Action", started_at_ms: 141 } },
  {
    event: "answer.block",
    data: {
      type: "mvp_outline",
      data: {
        goal: "Automate customer support ticket triage",
        pipeline: ["Ingest tickets", "Classify by category", "Route to owner"],
        mvp_scope: ["Ticket ingestion", "Rule-based classifier"],
        relevant_case_studies: ["fingoo", "perix-sentinel"],
        caveats: [],
      },
    },
  },
  { event: "suggestion", data: { type: "contact", label: "Discuss This Idea", reason: "Sounds like a good fit for a scoping call" } },
  {
    event: "trace.step",
    data: {
      id: "selecting_action",
      stage: "selecting_action",
      status: "completed",
      label: "Selecting Action",
      started_at_ms: 141,
      duration_ms: 8,
      detail: {
        tools: [
          { name: "generate_mvp_outline", status: "ok", duration_ms: 0 },
          { name: "suggest_contact", status: "ok", duration_ms: 1 },
        ],
        round: 1,
      },
    },
  },
  { event: "trace.step", data: { id: "generating_answer", stage: "generating_answer", status: "started", label: "Generating Answer", started_at_ms: 149 } },
  { event: "answer.delta", data: { text: "Here's a rough outline for that." } },
  {
    event: "trace.step",
    data: { id: "generating_answer", stage: "generating_answer", status: "completed", label: "Generating Answer", started_at_ms: 149, duration_ms: 950, detail: { model: "gpt-4o-mini", output_tokens: 40 } },
  },
  { event: "trace.meta", data: { intent: "solution_consulting" } },
  { event: "answer.done", data: { finish_reason: "stop", total_latency_ms: 1100 } },
];

/** F-04 — a greeting: search still runs (DD-14) but nothing is used or found. */
export const FIXTURE_NO_TOOL_GREETING: ChatSseEvent[] = [
  { event: "session", data: { session_id: "fixture-f04", resumed: false } },
  { event: "trace.step", data: { id: "understanding", stage: "understanding", status: "started", label: "Understanding", started_at_ms: 0 } },
  {
    event: "trace.step",
    data: { id: "understanding", stage: "understanding", status: "completed", label: "Understanding", started_at_ms: 0, duration_ms: 1, detail: { message_chars: 5, history_turns: 0 } },
  },
  { event: "trace.step", data: { id: "finding_context", stage: "finding_context", status: "started", label: "Finding Context", started_at_ms: 1 } },
  { event: "trace.step", data: { id: "retrieval", stage: "retrieving_experience", status: "started", label: "Retrieving Experience", started_at_ms: 1 } },
  {
    event: "trace.step",
    data: { id: "finding_context", stage: "finding_context", status: "completed", label: "Finding Context", started_at_ms: 1, duration_ms: 30, detail: { section: null, case_study: null, resolved: false } },
  },
  {
    event: "trace.step",
    data: { id: "retrieval", stage: "retrieving_experience", status: "completed", label: "Retrieving Experience", started_at_ms: 1, duration_ms: 90, detail: { result_count: 0, results: [], min_score: 0.3 } },
  },
  { event: "trace.step", data: { id: "selecting_action", stage: "selecting_action", status: "skipped", label: "Selecting Action", started_at_ms: 91 } },
  { event: "trace.step", data: { id: "generating_answer", stage: "generating_answer", status: "started", label: "Generating Answer", started_at_ms: 91 } },
  { event: "answer.delta", data: { text: "Hi! Ask me anything about Haewon's work." } },
  {
    event: "trace.step",
    data: { id: "generating_answer", stage: "generating_answer", status: "completed", label: "Generating Answer", started_at_ms: 91, duration_ms: 350, detail: { model: "gpt-4o-mini", output_tokens: 11 } },
  },
  { event: "trace.meta", data: { intent: "general" } },
  { event: "answer.done", data: { finish_reason: "stop", total_latency_ms: 450 } },
];

/** F-05 — the stream fails partway through generation; partial text must survive. */
export const FIXTURE_STREAMING_FAILURE: ChatSseEvent[] = [
  { event: "session", data: { session_id: "fixture-f05", resumed: false } },
  { event: "trace.step", data: { id: "understanding", stage: "understanding", status: "started", label: "Understanding", started_at_ms: 0 } },
  {
    event: "trace.step",
    data: { id: "understanding", stage: "understanding", status: "completed", label: "Understanding", started_at_ms: 0, duration_ms: 1, detail: { message_chars: 20, history_turns: 0 } },
  },
  { event: "trace.step", data: { id: "generating_answer", stage: "generating_answer", status: "started", label: "Generating Answer", started_at_ms: 1 } },
  { event: "answer.delta", data: { text: "Here's what I " } },
  { event: "answer.delta", data: { text: "was able to find before" } },
  { event: "error", data: { error: { code: "STREAM_INTERRUPTED", message: "The connection was interrupted. Please try again." } } },
];

/** F-06 — a suggestion whose anchor doesn't exist in this DOM (DD-27). */
export const FIXTURE_BAD_ANCHOR_SUGGESTION: ChatSseEvent[] = [
  { event: "session", data: { session_id: "fixture-f06", resumed: false } },
  { event: "trace.step", data: { id: "understanding", stage: "understanding", status: "started", label: "Understanding", started_at_ms: 0 } },
  {
    event: "trace.step",
    data: { id: "understanding", stage: "understanding", status: "completed", label: "Understanding", started_at_ms: 0, duration_ms: 1, detail: { message_chars: 24, history_turns: 0 } },
  },
  { event: "trace.step", data: { id: "selecting_action", stage: "selecting_action", status: "started", label: "Selecting Action", started_at_ms: 1 } },
  { event: "suggestion", data: { type: "section", label: "View a Stale Project", target: "#experience-does-not-exist", reason: "Content moved since this was indexed" } },
  {
    event: "trace.step",
    data: {
      id: "selecting_action",
      stage: "selecting_action",
      status: "completed",
      label: "Selecting Action",
      started_at_ms: 1,
      duration_ms: 4,
      detail: { tools: [{ name: "suggest_section", status: "ok", duration_ms: 2 }], round: 1 },
    },
  },
  { event: "trace.step", data: { id: "generating_answer", stage: "generating_answer", status: "started", label: "Generating Answer", started_at_ms: 5 } },
  { event: "answer.delta", data: { text: "Here's a project that might be relevant." } },
  {
    event: "trace.step",
    data: { id: "generating_answer", stage: "generating_answer", status: "completed", label: "Generating Answer", started_at_ms: 5, duration_ms: 300, detail: { model: "gpt-4o-mini", output_tokens: 10 } },
  },
  { event: "trace.meta", data: { intent: "portfolio_question" } },
  { event: "answer.done", data: { finish_reason: "stop", total_latency_ms: 320 } },
];
