import { describe, expect, it } from "vitest";
import {
  FIXTURE_BAD_ANCHOR_SUGGESTION,
  FIXTURE_MVP_OUTLINE,
  FIXTURE_NO_TOOL_GREETING,
  FIXTURE_SEARCH_SUCCESS,
  FIXTURE_STREAMING_FAILURE,
  FIXTURE_ZERO_RESULTS,
} from "./fixtures";
import { agentReducer } from "./reducer";
import { initialAgentState } from "./types";
import type { AgentState, AssistantMessage } from "./types";

function withPlaceholderTurn(state: AgentState): AgentState {
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
  return { ...state, status: "streaming", messages: [...state.messages, assistant] };
}

function runFixture(events: Parameters<typeof agentReducer>[1][]): AgentState {
  return events.reduce(agentReducer, withPlaceholderTurn(initialAgentState));
}

function lastAssistant(state: AgentState): AssistantMessage {
  const last = state.messages.at(-1);
  if (last === undefined || last.role !== "assistant") throw new Error("expected an assistant message");
  return last;
}

describe("fixtures render into the expected end state (D-51)", () => {
  it("F-01 search success: one section suggestion, filled retrieval slot, done", () => {
    const state = runFixture(FIXTURE_SEARCH_SUCCESS);
    const msg = lastAssistant(state);
    expect(state.status).toBe("idle");
    expect(msg.status).toBe("done");
    expect(msg.suggestions).toEqual([
      { type: "section", label: "View Fingoo Case Study", target: "#experience-fingoo", reason: "Directly relevant backend architecture" },
    ]);
    const retrieval = msg.trace.find((t) => t.stage === "retrieving_experience");
    expect(retrieval?.detail).toMatchObject({ result_count: 1 });
  });

  it("F-02 zero results: retrieval slot shows result_count 0, no suggestions", () => {
    const state = runFixture(FIXTURE_ZERO_RESULTS);
    const msg = lastAssistant(state);
    expect(msg.suggestions).toHaveLength(0);
    const retrieval = msg.trace.find((t) => t.stage === "retrieving_experience");
    expect(retrieval?.detail).toMatchObject({ result_count: 0, results: [] });
    expect(msg.text).toBe("I don't have information on that.");
  });

  it("F-03 MVP outline: one block, two relevant case studies, a contact suggestion", () => {
    const state = runFixture(FIXTURE_MVP_OUTLINE);
    const msg = lastAssistant(state);
    expect(msg.blocks).toHaveLength(1);
    expect(msg.blocks[0].data.relevant_case_studies).toEqual(["fingoo", "perix-sentinel"]);
    expect(msg.suggestions).toEqual([{ type: "contact", label: "Discuss This Idea", reason: "Sounds like a good fit for a scoping call" }]);
    expect(msg.intent).toBe("solution_consulting");
  });

  it("F-04 greeting: selecting_action skipped, no suggestions or blocks", () => {
    const state = runFixture(FIXTURE_NO_TOOL_GREETING);
    const msg = lastAssistant(state);
    const selecting = msg.trace.find((t) => t.stage === "selecting_action");
    expect(selecting?.status).toBe("skipped");
    expect(msg.suggestions).toHaveLength(0);
    expect(msg.blocks).toHaveLength(0);
  });

  it("F-05 streaming failure: partial text survives, message and top status end in error", () => {
    const state = runFixture(FIXTURE_STREAMING_FAILURE);
    const msg = lastAssistant(state);
    expect(state.status).toBe("error");
    expect(msg.status).toBe("error");
    expect(msg.text).toBe("Here's what I was able to find before");
    expect(msg.error?.code).toBe("STREAM_INTERRUPTED");
  });

  it("F-06 bad anchor suggestion: still collected in state (DOM validity is SuggestionCard's job, not the reducer's)", () => {
    const state = runFixture(FIXTURE_BAD_ANCHOR_SUGGESTION);
    const msg = lastAssistant(state);
    expect(msg.suggestions).toEqual([
      { type: "section", label: "View a Stale Project", target: "#experience-does-not-exist", reason: "Content moved since this was indexed" },
    ]);
  });
});
