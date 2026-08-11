import type {
  AnswerBlockPayload,
  AnswerDeltaPayload,
  AnswerDonePayload,
  SessionEventPayload,
  SuggestionPayload,
  TraceMetaPayload,
  TraceStepPayload,
} from "@/types/api";
import type { AgentErrorEventPayload, AgentSseEvent, AgentState, AssistantMessage } from "./types";

// SDD-04 D-33 / §3.2. Payload shapes for known event names are trusted
// as-is — SDD-03 §5.9 guarantees the backend only ever emits explicit,
// Pydantic-validated fields for these, so no extra runtime reshaping is
// needed beyond the `as` cast per branch below.

function updateLastAssistantMessage(
  state: AgentState,
  update: (message: AssistantMessage) => AssistantMessage,
): AgentState {
  const lastIndex = state.messages.length - 1;
  const last = state.messages[lastIndex];
  if (last === undefined || last.role !== "assistant") return state;
  const messages = state.messages.slice();
  messages[lastIndex] = update(last);
  return { ...state, messages };
}

export function agentReducer(state: AgentState, event: AgentSseEvent): AgentState {
  switch (event.event) {
    case "session": {
      const data = event.data as SessionEventPayload;
      const contextReset = state.sessionId !== null && state.sessionId !== data.session_id;
      return { ...state, sessionId: data.session_id, contextReset };
    }

    case "trace.step": {
      const data = event.data as TraceStepPayload;
      // §3.2 — same `id` updates in place (started -> completed), never duplicates.
      return updateLastAssistantMessage(state, (msg) => {
        const idx = msg.trace.findIndex((step) => step.id === data.id);
        const trace = idx === -1 ? [...msg.trace, data] : msg.trace.map((step, i) => (i === idx ? data : step));
        return { ...msg, trace };
      });
    }

    case "trace.meta": {
      const data = event.data as TraceMetaPayload;
      return updateLastAssistantMessage(state, (msg) => ({ ...msg, intent: data.intent }));
    }

    case "answer.delta": {
      const data = event.data as AnswerDeltaPayload;
      return updateLastAssistantMessage(state, (msg) => ({ ...msg, text: msg.text + data.text }));
    }

    case "answer.block": {
      const data = event.data as AnswerBlockPayload;
      return updateLastAssistantMessage(state, (msg) => ({ ...msg, blocks: [...msg.blocks, data] }));
    }

    case "suggestion": {
      const data = event.data as SuggestionPayload;
      return updateLastAssistantMessage(state, (msg) => ({ ...msg, suggestions: [...msg.suggestions, data] }));
    }

    case "answer.done": {
      const data = event.data as AnswerDonePayload;
      return {
        ...updateLastAssistantMessage(state, (msg) => ({
          ...msg,
          status: "done",
          latencyMs: data.total_latency_ms,
        })),
        status: "idle",
      };
    }

    case "error": {
      const data = event.data as AgentErrorEventPayload;
      return {
        ...updateLastAssistantMessage(state, (msg) => ({ ...msg, status: "error", error: data.error })),
        status: "error",
      };
    }

    // DD-22 — first request never even reached the backend.
    case "__network_error": {
      return { ...state, status: "degraded" };
    }

    // C-06 — Stop button / unmount: not an error, partial text stays.
    case "__aborted": {
      return {
        ...updateLastAssistantMessage(state, (msg) =>
          msg.status === "streaming" ? { ...msg, status: "done" } : msg,
        ),
        status: "idle",
      };
    }

    default:
      return state; // §3.3 — unknown event names are ignored, not errors
  }
}
