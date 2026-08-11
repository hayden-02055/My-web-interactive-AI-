// Mirrors api/app/schemas — see docs/sdd/SDD-00-foundation.md §6.5.
// Backend wire format is snake_case; keep this file in sync by hand (no codegen, §6.5).

export type HealthResponse = {
  status: "ok";
};

export type ErrorCode =
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "AGENT_FAILED"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    retry_after?: number;
  };
};

// SDD-03 §5 / docs/contracts/trace-events.md — SSE event payloads for
// `POST /api/v1/chat`. Field names stay snake_case to mirror the backend
// exactly (§6.5); SDD-04's reducer is the only place that reshapes these
// into the camelCase client state model.

export type ChatPageContext = {
  section?: string;
  case_study?: string;
};

export type ChatRequestBody = {
  message: string;
  session_id?: string;
  page_context?: ChatPageContext;
};

export type SessionEventPayload = {
  session_id: string;
  resumed: boolean;
};

export type TraceStage =
  | "understanding"
  | "finding_context"
  | "retrieving_experience"
  | "selecting_action"
  | "generating_answer";

export type TraceStepStatus = "started" | "completed" | "skipped" | "failed";

export type UnderstandingDetail = {
  message_chars: number;
  history_turns: number;
};

export type FindingContextDetail = {
  section: string | null;
  case_study: string | null;
  resolved: boolean;
};

export type RetrievalResultItem = {
  anchor: string;
  label: string;
  score: number;
};

export type RetrievingExperienceDetail = {
  result_count: number;
  results: RetrievalResultItem[];
  min_score: number;
};

export type ToolCallResult = {
  name: string;
  status: "ok" | "error";
  duration_ms: number;
};

export type SelectingActionDetail = {
  tools: ToolCallResult[];
  round: number;
};

export type GeneratingAnswerDetail = {
  model: string;
  output_tokens: number;
};

export type TraceStepDetail =
  | UnderstandingDetail
  | FindingContextDetail
  | RetrievingExperienceDetail
  | SelectingActionDetail
  | GeneratingAnswerDetail;

export type TraceStepPayload = {
  id: string;
  stage: TraceStage;
  status: TraceStepStatus;
  label: string;
  started_at_ms: number;
  duration_ms?: number | null;
  detail?: TraceStepDetail | null;
};

export type Intent = "solution_consulting" | "case_study_inquiry" | "portfolio_question" | "general";

export type TraceMetaPayload = {
  intent: Intent;
};

export type AnswerDeltaPayload = {
  text: string;
};

export type MvpOutlineData = {
  goal: string;
  pipeline: string[];
  mvp_scope: string[];
  relevant_case_studies: string[];
  caveats: string[];
};

export type AnswerBlockPayload = {
  type: "mvp_outline";
  data: MvpOutlineData;
};

export type AnswerDonePayload = {
  finish_reason: string;
  total_latency_ms: number;
};

export type SectionSuggestionPayload = {
  type: "section";
  label: string;
  target: string;
  reason: string;
};

export type ContactSuggestionPayload = {
  type: "contact";
  label: string;
  reason: string;
};

export type SuggestionPayload = SectionSuggestionPayload | ContactSuggestionPayload;

export type ErrorEventPayload = ErrorResponse;
