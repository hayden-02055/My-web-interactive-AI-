import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSseFrame, streamChat } from "./sseClient";
import type { AgentSseEvent } from "./types";

function chunkString(s: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < s.length; i += size) chunks.push(s.slice(i, i + size));
  return chunks;
}

function streamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status });
}

async function collect(gen: AsyncGenerator<AgentSseEvent, void, unknown>): Promise<AgentSseEvent[]> {
  const events: AgentSseEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

const SSE_BODY = [
  'event: session\ndata: {"session_id":"abc","resumed":false}\n\n',
  'event: answer.delta\ndata: {"text":"Hi"}\n\n',
  'event: answer.done\ndata: {"finish_reason":"stop","total_latency_ms":10}\n\n',
].join("");

describe("parseSseFrame", () => {
  it("joins multi-line data (C-04)", () => {
    expect(parseSseFrame('event: foo\ndata: line1\ndata: line2')).toEqual({
      event: "foo",
      data: "line1\nline2",
    });
  });

  it("returns null for a frame with no event: line (C-03)", () => {
    expect(parseSseFrame('data: {"foo":1}')).toBeNull();
  });
});

describe("streamChat", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("parses frames correctly no matter how the stream is chunked (C-02)", async () => {
    for (const size of [1, 3, 7, 64, 1000]) {
      fetchMock.mockResolvedValueOnce(streamResponse(chunkString(SSE_BODY, size)));
      const events = await collect(streamChat("http://api", { message: "hi" }));
      expect(events).toEqual([
        { event: "session", data: { session_id: "abc", resumed: false } },
        { event: "answer.delta", data: { text: "Hi" } },
        { event: "answer.done", data: { finish_reason: "stop", total_latency_ms: 10 } },
      ]);
    }
  });

  it("ignores frames without an event: line (C-03)", async () => {
    const body = 'data: {"stray":true}\n\n' + SSE_BODY;
    fetchMock.mockResolvedValueOnce(streamResponse([body]));
    const events = await collect(streamChat("http://api", { message: "hi" }));
    expect(events.map((e) => e.event)).toEqual(["session", "answer.delta", "answer.done"]);
  });

  it("parses a non-200 response as a JSON error envelope, not SSE (C-05)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "RATE_LIMITED", message: "slow down", retry_after: 30 } }),
        { status: 429 },
      ),
    );
    const events = await collect(streamChat("http://api", { message: "hi" }));
    expect(events).toEqual([
      { event: "error", data: { error: { code: "RATE_LIMITED", message: "slow down", retry_after: 30 } } },
    ]);
  });

  it("synthesizes an error when the stream ends without a terminal event (C-08)", async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['event: trace.step\ndata: {"id":"x"}\n\n']));
    const events = await collect(streamChat("http://api", { message: "hi" }));
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ event: "error", data: { error: { code: "STREAM_INTERRUPTED" } } });
  });

  it("does not synthesize an error when the stream ends with answer.done", async () => {
    fetchMock.mockResolvedValueOnce(streamResponse([SSE_BODY]));
    const events = await collect(streamChat("http://api", { message: "hi" }));
    expect(events.some((e) => e.event === "error")).toBe(false);
  });

  it("yields a network-error event when fetch throws (DD-22)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const events = await collect(streamChat("http://api", { message: "hi" }));
    expect(events).toEqual([{ event: "__network_error", data: {} }]);
  });

  it("yields an aborted event, not an error, when the signal is already aborted (C-06)", async () => {
    fetchMock.mockImplementationOnce(() => {
      const err = new DOMException("aborted", "AbortError");
      return Promise.reject(err);
    });
    const controller = new AbortController();
    const events = await collect(streamChat("http://api", { message: "hi" }, { signal: controller.signal }));
    expect(events).toEqual([{ event: "__aborted", data: {} }]);
  });

  it("aborts and reports an interrupted error on idle timeout (C-07)", async () => {
    vi.useFakeTimers();
    try {
      const stream = new ReadableStream<Uint8Array>({
        start() {
          // Never enqueues or closes — simulates a stalled connection.
        },
      });
      fetchMock.mockResolvedValueOnce(new Response(stream, { status: 200 }));

      const gen = streamChat("http://api", { message: "hi" }, { idleTimeoutMs: 1000 });
      const nextPromise = gen.next();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await nextPromise;

      expect(result.done).toBe(false);
      expect(result.value).toMatchObject({ event: "error", data: { error: { code: "STREAM_INTERRUPTED" } } });
    } finally {
      vi.useRealTimers();
    }
  });
});
