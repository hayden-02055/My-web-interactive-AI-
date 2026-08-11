"use client";

import { useAgent } from "./AgentProvider";

// DD-22 — reached only after a real request failed outright (no proactive
// health polling). The rest of the site is unaffected (INV-01); this notice
// is scoped to the panel only.
export function DegradedNotice() {
  const { retryLast } = useAgent();

  return (
    <div className="flex flex-col items-center gap-2 px-4 text-center">
      <p className="text-sm font-medium text-text">Agent is temporarily unavailable</p>
      <p className="text-xs text-text-muted">The rest of the site is unaffected — only the chat is down.</p>
      <button
        type="button"
        onClick={retryLast}
        className="mt-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-muted"
      >
        Retry
      </button>
    </div>
  );
}
