"use client";

import { Button } from "@/components/ui/Button";
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
      <Button type="button" variant="secondary" size="sm" className="mt-1" onClick={retryLast}>
        Retry
      </Button>
    </div>
  );
}
