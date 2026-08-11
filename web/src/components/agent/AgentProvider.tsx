"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ChatPageContext, ChatRequestBody } from "@/types/api";
import { loadPersistedAgentState, savePersistedAgentState } from "@/lib/agent/persistence";
import { agentReducer } from "@/lib/agent/reducer";
import { streamChat } from "@/lib/agent/sseClient";
import { initialAgentState } from "@/lib/agent/types";
import type { AgentErrorEventPayload, AgentState, AssistantMessage, UserMessage } from "@/lib/agent/types";
import { startPageContextObserver } from "@/lib/page-context/observer";
import { getPageContextSnapshot, setPageContext } from "@/lib/page-context/store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// A reload mid-stream leaves no way to resume that turn — normalize any
// restored "streaming" message to a terminal state instead of showing a
// spinner that will never finish.
function normalizeRestoredState(state: AgentState): AgentState {
  return {
    ...state,
    messages: state.messages.map((message) =>
      message.role === "assistant" && message.status === "streaming"
        ? ({
            ...message,
            status: "error",
            error: { code: "STREAM_INTERRUPTED", message: "This response was interrupted by a page reload." },
          } satisfies AssistantMessage)
        : message,
    ),
  };
}

type AgentContextValue = {
  state: AgentState;
  retryAvailableAt: number | null;
  sendMessage: (text: string) => void;
  stop: () => void;
  retryLast: () => void;
};

const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (ctx === null) throw new Error("useAgent must be used within an AgentProvider");
  return ctx;
}

export function AgentProvider({ children }: { children: ReactNode }) {
  // Starts identical to the server-rendered state on purpose — reading
  // sessionStorage here (server has none) would make the client's first
  // render disagree with the SSR HTML and trigger a hydration error.
  // Restoration happens in the effect below, strictly after hydration.
  const [state, setState] = useState<AgentState>(initialAgentState);
  const [retryAvailableAt, setRetryAvailableAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserTextRef = useRef<string | null>(null);
  // Guards the save effect below from firing (with the still-empty initial
  // state) before the restore effect below has had its turn on mount.
  const restoredRef = useRef(false);

  // D-37 — restore the transcript once, after mount (see note above). This
  // is the standard React-documented exception to `set-state-in-effect`:
  // reading a browser-only store (sessionStorage) can't happen during the
  // hydration render without mismatching the server's markup, so the
  // update is deliberately deferred to right after mount.
  useEffect(() => {
    const persisted = loadPersistedAgentState();
    if (persisted !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) => normalizeRestoredState({ ...s, sessionId: persisted.sessionId, messages: persisted.messages }));
    }
    restoredRef.current = true;
  }, []);

  // D-39 — the one detector both the panel and nav highlighting read from.
  useEffect(() => startPageContextObserver(setPageContext), []);

  // D-37 — cheap; only real growth is new turns, not every render.
  useEffect(() => {
    if (!restoredRef.current) return;
    savePersistedAgentState({ sessionId: state.sessionId, messages: state.messages });
  }, [state.sessionId, state.messages]);

  // C-06 — abort any in-flight stream on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed === "" || state.status === "streaming") return;

      lastUserTextRef.current = trimmed;
      const pageContext = getPageContextSnapshot(); // DD-20 — fixed now, not re-read mid-stream

      const userMessage: UserMessage = {
        id: createId(),
        role: "user",
        text: trimmed,
        pageContext,
        createdAt: Date.now(),
      };
      const assistantMessage: AssistantMessage = {
        id: createId(),
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

      setState((s) => ({
        ...s,
        status: "streaming",
        contextReset: false,
        messages: [...s.messages, userMessage, assistantMessage],
      }));
      setRetryAvailableAt(null);

      const pageContextForRequest: ChatPageContext | undefined =
        pageContext.section !== null || pageContext.caseStudy !== null
          ? {
              ...(pageContext.section !== null ? { section: pageContext.section } : {}),
              ...(pageContext.caseStudy !== null ? { case_study: pageContext.caseStudy } : {}),
            }
          : undefined;

      const body: ChatRequestBody = {
        message: trimmed,
        ...(state.sessionId !== null ? { session_id: state.sessionId } : {}),
        ...(pageContextForRequest !== undefined ? { page_context: pageContextForRequest } : {}),
      };

      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        for await (const evt of streamChat(API_BASE_URL, body, { signal: controller.signal })) {
          if (evt.event === "error") {
            const retryAfter = (evt.data as AgentErrorEventPayload).error.retry_after;
            if (typeof retryAfter === "number") {
              setRetryAvailableAt(Date.now() + retryAfter * 1000);
            }
          }
          setState((s) => agentReducer(s, evt));
        }
        abortRef.current = null;
      })();
    },
    [state.status, state.sessionId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retryLast = useCallback(() => {
    if (lastUserTextRef.current !== null) sendMessage(lastUserTextRef.current);
  }, [sendMessage]);

  return (
    <AgentContext.Provider value={{ state, retryAvailableAt, sendMessage, stop, retryLast }}>
      {children}
    </AgentContext.Provider>
  );
}
