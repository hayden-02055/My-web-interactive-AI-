import type { ReactNode } from "react";

export type PortfolioLayoutProps = {
  nav: ReactNode;
  content: ReactNode;
  agentSlot: ReactNode;
};

// 2-column desktop grid (SDD-01 §6.1). Mobile collapses to a single column
// and drops the agent column entirely (§6.2) — the real bottom-sheet/overlay
// treatment is SDD-09's job, not this SDD's.
export function PortfolioLayout({ nav, content, agentSlot }: PortfolioLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 lg:px-10">
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
