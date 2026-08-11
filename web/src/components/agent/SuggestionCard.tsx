"use client";

import { useEffect, useState } from "react";
import type { Suggestion } from "@/lib/agent/types";
import { anchorExists, navigateToAnchor } from "@/lib/agent/navigate";

export type SuggestionCardProps = { suggestion: Suggestion };

// SDD-05 D-41/42/43. DD-26 — the click never issues a network request, it
// only interprets an anchor the server already validated (SDD-03 §4.3).
export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const isContact = suggestion.type === "contact";
  const anchor = isContact ? "contact" : suggestion.target.replace(/^#/, "");
  // Assume available until proven otherwise — checked after mount since
  // `document` doesn't exist during SSR.
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    // Another documented exception to `set-state-in-effect`: whether the
    // anchor exists is a fact about the real DOM, not something derivable
    // from props/state — there's no non-effect way to learn it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(anchorExists(anchor));
  }, [anchor]);

  function handleClick() {
    const ok = navigateToAnchor(anchor);
    if (!ok) {
      // DD-27 — normally unreachable (server-validated), but content/index
      // drift could still leave a stale anchor; fail visibly, not silently.
      setAvailable(false);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Agent] suggestion target #${anchor} was not found in the DOM`);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!available}
      className={`flex w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        isContact
          ? "border-accent bg-accent text-accent-foreground hover:opacity-90"
          : "border-border bg-surface text-text hover:bg-surface-muted"
      }`}
    >
      <span className="font-medium">{suggestion.label}</span>
      {suggestion.reason !== "" ? (
        <span className={isContact ? "text-accent-foreground/80" : "text-text-muted"}>{suggestion.reason}</span>
      ) : null}
      {!available ? <span className="text-text-muted">This link is no longer available.</span> : null}
    </button>
  );
}
