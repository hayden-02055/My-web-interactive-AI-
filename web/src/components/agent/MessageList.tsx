"use client";

import { useEffect, useRef, useState } from "react";
import { useAgent } from "./AgentProvider";
import { MessageItem } from "./MessageItem";
import { StarterPrompts } from "./StarterPrompts";

const STICK_THRESHOLD_PX = 32;

// U-02 — this list scrolls independently of the portfolio (`overflow-y-auto`
// on a fixed-height parent, never the page body). U-03 — sticks to the
// bottom as new content arrives, unless the visitor has scrolled up.
export function MessageList() {
  const { state } = useAgent();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  function handleScroll() {
    const el = containerRef.current;
    if (el === null) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < STICK_THRESHOLD_PX);
  }

  useEffect(() => {
    if (!stickToBottom) return;
    const el = containerRef.current;
    if (el === null) return;
    el.scrollTop = el.scrollHeight;
  }, [state.messages, stickToBottom]);

  // SDD-06 DD-31 — the first assistant message in the transcript stays
  // expanded even after it completes, so the X-ray is discovered at least once.
  const firstAssistantId = state.messages.find((m) => m.role === "assistant")?.id ?? null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
    >
      {state.contextReset ? (
        <p className="rounded-lg bg-surface-muted px-2 py-1 text-[11px] text-text-muted">
          Your session context was reset — the Agent may not remember earlier messages in this conversation.
        </p>
      ) : null}
      {state.messages.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">Ask me about Haewon&apos;s projects, skills, or how he works.</p>
          <StarterPrompts />
        </div>
      ) : (
        state.messages.map((message) => (
          <MessageItem key={message.id} message={message} isFirstAssistantMessage={message.id === firstAssistantId} />
        ))
      )}
    </div>
  );
}
