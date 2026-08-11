"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAgent } from "./AgentProvider";

// DD-24 — no automatic retry; a `RATE_LIMITED` error disables sending for
// `retry_after` seconds instead of the client silently re-requesting.
export function Composer() {
  // `composerValue` lives in AgentProvider (not local state) so
  // StarterPrompts (SDD-05 §1.5) can fill it without sending.
  const { state, sendMessage, stop, retryAvailableAt, composerValue: value, setComposerValue: setValue } = useAgent();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (retryAvailableAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [retryAvailableAt]);

  const isStreaming = state.status === "streaming";
  const isDegraded = state.status === "degraded";
  const retryWaitMs = retryAvailableAt !== null ? retryAvailableAt - now : 0;
  const rateLimited = retryWaitMs > 0;

  function submit() {
    if (value.trim() === "" || isStreaming || isDegraded || rateLimited) return;
    sendMessage(value);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex flex-col gap-1 border-t border-border p-3">
      {rateLimited ? (
        <p className="text-[11px] text-text-muted">Too many requests — try again in {Math.ceil(retryWaitMs / 1000)}s</p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || isDegraded}
          placeholder="Ask about my work..."
          rows={1}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:ring-1 focus:ring-accent focus:outline-none disabled:opacity-60"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className="shrink-0 rounded-full border border-border px-3 py-2 text-xs font-medium text-text transition-colors hover:bg-surface-muted"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={value.trim() === "" || isDegraded || rateLimited}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
