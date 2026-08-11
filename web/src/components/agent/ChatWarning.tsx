// SDD-00 §7.3 / PRD §12 — shown at all times in the input area (U-05), not
// just on first use. Wording is fixed by SDD-00, not ours to soften.
export function ChatWarning() {
  return (
    <p className="text-[11px] leading-snug text-text-muted">
      Do not share passwords, API keys, private customer data, or other sensitive information with this AI Agent.
    </p>
  );
}
