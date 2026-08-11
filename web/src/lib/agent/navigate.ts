// SDD-05 DD-26/27/28 — the one place that turns a suggestion/search-result
// anchor into an actual scroll. Framework-free so SuggestionCard, XrayDetail,
// and MvpOutlineBlock all share identical behavior instead of three
// slightly-different click handlers.

const HIGHLIGHT_CLASS = "agent-highlight";
const HIGHLIGHT_DURATION_MS = 1600;

export function anchorExists(anchor: string): boolean {
  if (typeof document === "undefined") return false;
  return document.getElementById(anchor) !== null;
}

/**
 * Scrolls to `anchor`, highlights it briefly, and moves focus there (DD-28).
 * Returns false (and does nothing) if the anchor isn't in the DOM (DD-27) —
 * callers are responsible for reflecting that back as a disabled state.
 */
export function navigateToAnchor(anchor: string): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  const el = document.getElementById(anchor);
  if (el === null) return false;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });

  // A non-interactive element (<section>, <article>) can't normally receive
  // focus; tabindex=-1 allows programmatic focus without joining tab order.
  const hadTabIndex = el.hasAttribute("tabindex");
  if (!hadTabIndex) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });

  el.classList.remove(HIGHLIGHT_CLASS);
  // Force a reflow so re-adding the class restarts the animation even if
  // the same target was just highlighted a moment ago.
  void el.offsetWidth;
  el.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_DURATION_MS);

  return true;
}
