// SDD-04 D-34 / §5.1 — a tiny external store (React 19 `useSyncExternalStore`
// compatible) so both the Agent panel and `SectionNav` can read the current
// position without importing each other (SDD-00 §6.3 isolation — both may
// depend on `lib/`, neither depends on the other).

export type PageContextValue = {
  section: string | null;
  caseStudy: string | null;
};

const NONE: PageContextValue = { section: null, caseStudy: null };

let current: PageContextValue = NONE;
const listeners = new Set<() => void>();

export function getPageContextSnapshot(): PageContextValue {
  return current;
}

export function getServerPageContextSnapshot(): PageContextValue {
  return NONE;
}

// DD-21 — commits (and notifies) only when the value actually changed, so a
// scroll-driven observer callback doesn't cause a re-render storm.
export function setPageContext(next: PageContextValue): void {
  if (next.section === current.section && next.caseStudy === current.caseStudy) return;
  current = next;
  for (const listener of listeners) listener();
}

export function subscribePageContext(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Test-only escape hatch — production code should never need to force the
// store back to empty (there is no real "no page" state once mounted).
export function resetPageContextForTests(): void {
  current = NONE;
}
