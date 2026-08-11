import type { ReactNode } from "react";

// UI Refactoring §17 — dedupes the exact-duplicate H2 pattern between
// SectionContainer and CaseStudyList.
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-semibold tracking-tight text-text">{children}</h2>;
}
