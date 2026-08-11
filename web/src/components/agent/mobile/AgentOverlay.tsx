"use client";

import { useEffect, useRef } from "react";
import { useAgent } from "../AgentProvider";
import { ChatWarning } from "../ChatWarning";
import { Composer } from "../Composer";
import { DegradedNotice } from "../DegradedNotice";
import { MessageList } from "../MessageList";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// SDD-08 D-53/56 — full-screen shell. DD-36: closing this only flips
// `overlayOpen`; `AgentProvider` (and any in-flight stream) lives above it
// and is never unmounted, so a reopen picks up exactly where it left off.
export function AgentOverlay() {
  const { state, overlayOpen, closeOverlay, fabRef } = useAgent();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // M-04 — lock background scroll while open, restore on close.
  useEffect(() => {
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  // A-02 — focus moves in on open, Tab is trapped inside, Escape closes,
  // and focus returns to the FAB once this effect tears down. `fabRef`'s
  // node is captured into a local up front (rather than read fresh inside
  // the cleanup) — it's the same stable node either way since AgentFab
  // never unmounts, but capturing it here is what actually makes that
  // guarantee explicit at the point this effect depends on it.
  useEffect(() => {
    if (!overlayOpen) return;
    const container = containerRef.current;
    if (container === null) return;
    const fabElement = fabRef.current;

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    (focusables()[0] ?? container).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (elements.length === 0) return;
      const firstEl = elements[0];
      const lastEl = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      fabElement?.focus();
    };
  }, [overlayOpen, closeOverlay, fabRef]);

  if (!overlayOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="AI Agent"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-surface lg:hidden"
      style={{
        // M-05 — respect notches / home indicators.
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-text">AI Agent</p>
        <button
          type="button"
          onClick={closeOverlay}
          aria-label="Close AI Agent"
          className="rounded-full p-3 text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
