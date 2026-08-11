"use client";

import { useAgent } from "../AgentProvider";

// SDD-08 D-53/DD-35 — closed-state entry point on mobile. Hidden on desktop
// (M-01). Stays mounted (never unmounted) even while the overlay is open —
// it just sits under it (z-40 vs the overlay's z-50) with pointer events
// and tab order disabled — so its DOM node is still there for the overlay
// to return focus to on close (A-02). Unmounting it on open would work for
// the "open" side but breaks the "close" side: React would tear down this
// exact node in the same commit that focus needs to be captured from.
export function AgentFab() {
  const { state, overlayOpen, openOverlay, fabRef } = useAgent();

  const isStreaming = state.status === "streaming";

  return (
    <button
      ref={fabRef}
      type="button"
      onClick={openOverlay}
      aria-label={isStreaming ? "Open AI Agent — response in progress" : "Open AI Agent"}
      aria-hidden={overlayOpen}
      tabIndex={overlayOpen ? -1 : 0}
      className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden ${
        overlayOpen ? "pointer-events-none opacity-0" : ""
      }`}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.163-3.02-.465L3 21l1.395-3.72C3.512 16.042 3 14.574 3 13c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      {isStreaming ? (
        <span aria-hidden className="absolute top-1 right-1 h-2.5 w-2.5 animate-pulse rounded-full bg-accent-foreground" />
      ) : null}
    </button>
  );
}
