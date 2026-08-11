"use client";

import { useSyncExternalStore } from "react";
import { getPageContextSnapshot, getServerPageContextSnapshot, subscribePageContext } from "@/lib/page-context/store";

export type NavItem = {
  id: string;
  label: string;
};

export type SectionNavProps = {
  items: NavItem[];
};

// SDD-04 D-39/DD-21 — reads the same page-context store the Agent panel
// reads, so nav highlighting and Agent's notion of "current position" can
// never disagree (they share one IntersectionObserver, started by
// `AgentProvider`). This module never imports anything from `components/agent`
// (SDD-00 §6.3) — only the shared `lib/page-context` store.
export function SectionNav({ items }: SectionNavProps) {
  const pageContext = useSyncExternalStore(subscribePageContext, getPageContextSnapshot, getServerPageContextSnapshot);

  return (
    <nav aria-label="Section navigation" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border py-4 text-sm">
      {items.map((item) => {
        const isActive = item.id === pageContext.section;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? "true" : undefined}
            className={isActive ? "font-medium text-text" : "text-text-muted transition-colors hover:text-text"}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
