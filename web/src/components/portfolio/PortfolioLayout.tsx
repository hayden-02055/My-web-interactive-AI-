import type { ReactNode } from "react";

export type PortfolioLayoutProps = {
  nav: ReactNode;
  content: ReactNode;
  agentSlot: ReactNode;
};

// 2-column desktop grid (SDD-01 §6.1). Below `lg` (1200px, see globals.css
// --breakpoint-lg) it collapses to a single column and drops the agent
// column entirely — replaced by the FAB + full-screen overlay treatment in
// `components/agent/mobile/` (SDD-08).
export function PortfolioLayout({ nav, content, agentSlot }: PortfolioLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-[1320px] flex-1 grid-cols-1 gap-[var(--space-6)] px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-[var(--space-7)] lg:px-10">
      <div className="flex min-w-0 flex-col">
        {nav}
        <main id="main-content" className="flex flex-col">
          {content}
        </main>
      </div>
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-fit">{agentSlot}</aside>
    </div>
  );
}
