import type { AgentMessage } from "./types";

// SDD-04 D-37 / DD-23 — `sessionStorage`, not `localStorage`: clearing on
// tab close matches PRD §12 "Session 중심 처리, 민감정보 저장 지양", and a
// new tab starting a fresh session (DoD 9.3) falls out of that for free.
// `status`/`contextReset` are deliberately NOT persisted — they're
// ephemeral UI state, not part of the transcript.

const STORAGE_KEY = "agent:session";
const MAX_MESSAGES = 50;
const MAX_BYTES = 200_000;

export type PersistedAgentState = {
  sessionId: string | null;
  messages: AgentMessage[];
};

export function loadPersistedAgentState(): PersistedAgentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("messages" in parsed) ||
      !Array.isArray((parsed as { messages: unknown }).messages)
    ) {
      return null;
    }
    const candidate = parsed as PersistedAgentState;
    return { sessionId: candidate.sessionId ?? null, messages: candidate.messages };
  } catch {
    return null;
  }
}

export function savePersistedAgentState(state: PersistedAgentState): void {
  if (typeof window === "undefined") return;

  let messages = state.messages.slice(-MAX_MESSAGES);
  let serialized = JSON.stringify({ sessionId: state.sessionId, messages });

  // Storage cap (DoD 9.3) — drop the oldest turns until it fits, rather
  // than losing the whole transcript to a quota error.
  while (serialized.length > MAX_BYTES && messages.length > 1) {
    messages = messages.slice(1);
    serialized = JSON.stringify({ sessionId: state.sessionId, messages });
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Storage full or unavailable (e.g. private browsing) — never let
    // persistence failures break the conversation itself.
  }
}

export function clearPersistedAgentState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
