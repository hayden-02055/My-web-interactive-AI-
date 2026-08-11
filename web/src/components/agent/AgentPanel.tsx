"use client";

import { useAgent } from "./AgentProvider";
import { ChatWarning } from "./ChatWarning";
import { Composer } from "./Composer";
import { DegradedNotice } from "./DegradedNotice";
import { MessageList } from "./MessageList";

// U-01 — fixed-height sidebar card (widened alongside PortfolioLayout's
// 360px agent column, UI Refactoring Phase 1). U-07 — this component only
// branches on `state.status`; it owns no state of its own, so the mobile
// shell (`components/agent/mobile/`) can reuse the same internals without
// touching AgentProvider.
export function AgentPanel() {
  const { state } = useAgent();

  return (
    <div
      id="agent-slot"
      className="scroll-mt-24 flex h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-text">AI Agent</p>
      </div>

      {state.status === "degraded" ? (
        <div className="flex flex-1 items-center justify-center">
          <DegradedNotice />
        </div>
      ) : (
        <MessageList />
      )}

      <div className="border-t border-border px-3 pt-2">
        <ChatWarning />
      </div>
      <Composer />
    </div>
  );
}
