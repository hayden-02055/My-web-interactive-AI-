"use client";

import { useAgent } from "./AgentProvider";
import { ChatWarning } from "./ChatWarning";
import { Composer } from "./Composer";
import { DegradedNotice } from "./DegradedNotice";
import { MessageList } from "./MessageList";

// U-01 — same slot footprint as SDD-01's `AgentSlotPlaceholder`
// (`h-[420px]`, `rounded-2xl border border-border`), so replacing it here
// doesn't reflow the layout. U-07 — this component only branches on
// `state.status`; it owns no state of its own, so SDD-09 can swap the shell
// (e.g. a mobile bottom sheet) without touching AgentProvider.
export function AgentPanel() {
  const { state } = useAgent();

  return (
    <div
      id="agent-slot"
      className="scroll-mt-24 flex h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-surface"
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
