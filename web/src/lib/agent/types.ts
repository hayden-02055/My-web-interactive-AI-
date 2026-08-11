import type {
  AnswerBlockPayload,
  AnswerDeltaPayload,
  AnswerDonePayload,
  ErrorEventPayload,
  SessionEventPayload,
  SuggestionPayload,
  TraceMetaPayload,
  TraceStepPayload,
} from "@/types/api";

// SDD-04 D-31 — client mirror of SDD-03 §5. `TraceStep` / `Suggestion` /
// `AnswerBlock` / `AgentError` reuse the wire payload shapes verbatim (§3.1:
// "필드를 임의로 축약하지 않는다") — only the top-level state fields below
// get the camelCase treatment `docs/conventions.md` §6.3 asks for.

export type TraceStep = TraceStepPayload;
export type Suggestion = SuggestionPayload;
export type AnswerBlock = AnswerBlockPayload;

// Widened (not narrowed) beyond the backend's ErrorCode: `STREAM_INTERRUPTED`
// is synthesized by `sseClient` itself for idle-timeout/disconnect (C-07/C-08)
// — conditions the backend never sees, so there's no wire code for them. A
// real `ErrorEventPayload` is always assignable here; the reverse isn't true.
export type AgentError = Omit<ErrorEventPayload["error"], "code"> & {
  code: ErrorEventPayload["error"]["code"] | "STREAM_INTERRUPTED";
};

export type AgentErrorEventPayload = { error: AgentError };

export type AgentStatus = "idle" | "streaming" | "error" | "degraded";

export type PageContextSnapshot = {
  section: string | null;
  caseStudy: string | null;
};

export type UserMessage = {
  id: string;
  role: "user";
  text: string;
  pageContext: PageContextSnapshot; // DD-20 snapshot, captured at send time
  createdAt: number;
};

export type AssistantMessage = {
  id: string;
  role: "assistant";
  status: "streaming" | "done" | "error";
  text: string; // answer.delta, accumulated
  blocks: AnswerBlock[]; // answer.block -> SDD-07
  suggestions: Suggestion[]; // suggestion -> SDD-05
  trace: TraceStep[]; // trace.step -> SDD-06
  intent: string | null; // trace.meta
  latencyMs: number | null; // answer.done
  error: AgentError | null; // error
};

export type AgentMessage = UserMessage | AssistantMessage;

export type AgentState = {
  status: AgentStatus;
  sessionId: string | null;
  messages: AgentMessage[];
  contextReset: boolean; // DD-23 — server issued a new session_id mid-conversation
};

export const initialAgentState: AgentState = {
  status: "idle",
  sessionId: null,
  messages: [],
  contextReset: false,
};

// The real wire events a stream can produce (SDD-03 §3.3, forward-compatible
// with unknown `event` names the reducer will just ignore).
export type ChatSseEvent =
  | { event: "session"; data: SessionEventPayload }
  | { event: "trace.step"; data: TraceStepPayload }
  | { event: "trace.meta"; data: TraceMetaPayload }
  | { event: "answer.delta"; data: AnswerDeltaPayload }
  | { event: "answer.block"; data: AnswerBlockPayload }
  | { event: "suggestion"; data: SuggestionPayload }
  | { event: "answer.done"; data: AnswerDonePayload }
  | { event: "error"; data: AgentErrorEventPayload }
  | { event: string; data: unknown };

// Client-only signals `sseClient` synthesizes — never sent by the backend,
// namespaced with `__` so they can't collide with a future real event name.
// `network-error` covers DD-22 (first request fails outright -> degraded);
// `aborted` covers C-06 (Stop button / unmount, not an error).
export type ClientSyntheticEvent =
  | { event: "__network_error"; data: Record<string, never> }
  | { event: "__aborted"; data: Record<string, never> };

export type AgentSseEvent = ChatSseEvent | ClientSyntheticEvent;
