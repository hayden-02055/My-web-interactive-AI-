import type { ChatRequestBody, ErrorResponse } from "@/types/api";
import type { AgentErrorEventPayload, AgentSseEvent } from "./types";

// SDD-04 D-32 — DD-18: `fetch` + `ReadableStream`, not `EventSource` (POST
// body, no auto-reconnect — see DD-18/DD-24). Framework-free (§4.3) so this
// can be unit tested with a mock stream and reused before any UI exists.

const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const TERMINAL_EVENTS = new Set(["answer.done", "error"]);

export type StreamChatOptions = {
  signal?: AbortSignal;
  idleTimeoutMs?: number;
};

class IdleTimeoutError extends Error {}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function withIdleTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new IdleTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// C-02/C-04 — a single `\n\n`-delimited frame -> {event, data}. Multiple
// `data:` lines join with `\n` per the SSE spec. Pure parse, no I/O — the
// caller decides what an absent `event:` line means (C-03).
export function parseSseFrame(frame: string): { event: string; data: string } | null {
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }
  if (event === null) return null;
  return { event, data: dataLines.join("\n") };
}

function parseEventData(raw: string): unknown {
  if (raw === "") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function interruptedEvent(message: string): AgentSseEvent {
  const data: AgentErrorEventPayload = { error: { code: "STREAM_INTERRUPTED", message } };
  return { event: "error", data };
}

/**
 * Streams one `/api/v1/chat` turn as normalized events. Pre-stream JSON
 * errors (C-05), idle timeouts (C-07), and unexpected disconnects (C-08) are
 * all normalized into the same `error` event shape the reducer already
 * knows how to handle — callers never need a second error-handling path.
 */
export async function* streamChat(
  baseUrl: string,
  body: ChatRequestBody,
  options: StreamChatOptions = {},
): AsyncGenerator<AgentSseEvent, void, unknown> {
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/chat`, {
      method: "POST", // C-01
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (err) {
    if (isAbortError(err)) {
      yield { event: "__aborted", data: {} };
      return;
    }
    yield { event: "__network_error", data: {} }; // DD-22
    return;
  }

  if (!response.ok) {
    // C-05 — non-200 is a JSON error envelope, not an SSE body.
    let parsed: ErrorResponse | null = null;
    try {
      parsed = (await response.json()) as ErrorResponse;
    } catch {
      parsed = null;
    }
    yield {
      event: "error",
      data: parsed ?? { error: { code: "INTERNAL_ERROR", message: "Request failed." } },
    };
    return;
  }

  if (response.body === null) {
    yield { event: "__network_error", data: {} };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawTerminalEvent = false;

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await withIdleTimeout(reader.read(), idleTimeoutMs);
      } catch (err) {
        if (err instanceof IdleTimeoutError) {
          await reader.cancel().catch(() => {});
          yield interruptedEvent("The response stalled. Please try again."); // C-07
          return;
        }
        throw err;
      }

      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      let frameEnd = buffer.indexOf("\n\n");
      while (frameEnd !== -1) {
        const rawFrame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 2);
        const parsed = parseSseFrame(rawFrame);
        if (parsed !== null) {
          if (TERMINAL_EVENTS.has(parsed.event)) sawTerminalEvent = true;
          yield { event: parsed.event, data: parseEventData(parsed.data) } as AgentSseEvent;
        }
        frameEnd = buffer.indexOf("\n\n");
      }
    }
  } catch (err) {
    if (isAbortError(err)) {
      yield { event: "__aborted", data: {} };
      return;
    }
    throw err;
  }

  if (!sawTerminalEvent) {
    yield interruptedEvent("The connection was interrupted. Please try again."); // C-08
  }
}
