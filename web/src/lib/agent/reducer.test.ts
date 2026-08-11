import { describe, expect, it } from "vitest";
import { agentReducer } from "./reducer";
import { initialAgentState } from "./types";
import type { AgentState, AssistantMessage, UserMessage } from "./types";

function withTurn(state: AgentState): AgentState {
  const user: UserMessage = {
    id: "u1",
    role: "user",
    text: "hi",
    pageContext: { section: null, caseStudy: null },
    createdAt: 0,
  };
  const assistant: AssistantMessage = {
    id: "a1",
    role: "assistant",
    status: "streaming",
    text: "",
    blocks: [],
    suggestions: [],
    trace: [],
    intent: null,
    latencyMs: null,
    error: null,
  };
  return { ...state, status: "streaming", messages: [...state.messages, user, assistant] };
}

function lastAssistant(state: AgentState): AssistantMessage {
  const last = state.messages.at(-1);
  if (last === undefined || last.role !== "assistant") throw new Error("expected an assistant message");
  return last;
}

describe("agentReducer", () => {
  it("sets sessionId on session and marks contextReset when it changes", () => {
    const first = agentReducer(initialAgentState, { event: "session", data: { session_id: "s1", resumed: false } });
    expect(first.sessionId).toBe("s1");
    expect(first.contextReset).toBe(false);

    const resumed = agentReducer(first, { event: "session", data: { session_id: "s1", resumed: true } });
    expect(resumed.contextReset).toBe(false);

    const rotated = agentReducer(first, { event: "session", data: { session_id: "s2", resumed: false } });
    expect(rotated.sessionId).toBe("s2");
    expect(rotated.contextReset).toBe(true);
  });

  it("appends a new trace.step id and updates an existing one in place, no duplicates", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, {
      event: "trace.step",
      data: { id: "understanding", stage: "understanding", status: "started", label: "Understanding", started_at_ms: 0 },
    });
    expect(lastAssistant(state).trace).toHaveLength(1);

    state = agentReducer(state, {
      event: "trace.step",
      data: {
        id: "understanding",
        stage: "understanding",
        status: "completed",
        label: "Understanding",
        started_at_ms: 0,
        duration_ms: 5,
      },
    });
    const trace = lastAssistant(state).trace;
    expect(trace).toHaveLength(1);
    expect(trace[0]).toMatchObject({ status: "completed", duration_ms: 5 });
  });

  it("accumulates answer.delta text", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, { event: "answer.delta", data: { text: "Hel" } });
    state = agentReducer(state, { event: "answer.delta", data: { text: "lo" } });
    expect(lastAssistant(state).text).toBe("Hello");
  });

  it("appends answer.block and suggestion without overwriting each other", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, {
      event: "answer.block",
      data: { type: "mvp_outline", data: { goal: "g", pipeline: [], mvp_scope: [], relevant_case_studies: [], caveats: [] } },
    });
    state = agentReducer(state, {
      event: "suggestion",
      data: { type: "contact", label: "Discuss", reason: "r" },
    });
    const msg = lastAssistant(state);
    expect(msg.blocks).toHaveLength(1);
    expect(msg.suggestions).toHaveLength(1);
  });

  it("sets trace.meta intent", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, { event: "trace.meta", data: { intent: "portfolio_question" } });
    expect(lastAssistant(state).intent).toBe("portfolio_question");
  });

  it("finalizes on answer.done: message status done, latencyMs set, top status idle", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, { event: "answer.done", data: { finish_reason: "stop", total_latency_ms: 42 } });
    expect(state.status).toBe("idle");
    const msg = lastAssistant(state);
    expect(msg.status).toBe("done");
    expect(msg.latencyMs).toBe(42);
  });

  it("finalizes on error: message status error, top status error", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, {
      event: "error",
      data: { error: { code: "AGENT_FAILED", message: "boom" } },
    });
    expect(state.status).toBe("error");
    const msg = lastAssistant(state);
    expect(msg.status).toBe("error");
    expect(msg.error).toEqual({ code: "AGENT_FAILED", message: "boom" });
  });

  it("keeps partial text on error (nothing clears it)", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, { event: "answer.delta", data: { text: "partial" } });
    state = agentReducer(state, { event: "error", data: { error: { code: "AGENT_FAILED", message: "boom" } } });
    expect(lastAssistant(state).text).toBe("partial");
  });

  it("ignores unknown event names without throwing (§3.3)", () => {
    const state = withTurn(initialAgentState);
    // Deliberately an event name outside the known literal set — `AgentSseEvent`'s
    // catch-all member is what makes this forward-compatible (§3.3), so it's not a type error.
    const next = agentReducer(state, { event: "future.event", data: { anything: 1 } });
    expect(next).toEqual(state);
  });

  it("sets status degraded on __network_error", () => {
    const state = agentReducer(initialAgentState, { event: "__network_error", data: {} });
    expect(state.status).toBe("degraded");
  });

  it("marks a streaming message done (not error) and status idle on __aborted, keeping partial text", () => {
    let state = withTurn(initialAgentState);
    state = agentReducer(state, { event: "answer.delta", data: { text: "partial" } });
    state = agentReducer(state, { event: "__aborted", data: {} });
    expect(state.status).toBe("idle");
    const msg = lastAssistant(state);
    expect(msg.status).toBe("done");
    expect(msg.text).toBe("partial");
  });

  it("is a no-op when there is no assistant message to update", () => {
    const next = agentReducer(initialAgentState, { event: "answer.delta", data: { text: "x" } });
    expect(next).toEqual(initialAgentState);
  });
});
