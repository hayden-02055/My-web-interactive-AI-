import type { CaseStudy, CaseStudyStatus } from "@/types/content";

const STATUS_LABEL: Record<CaseStudyStatus, string> = {
  shipped: "Shipped",
  "in-progress": "In Progress",
  prototype: "Prototype",
  archived: "Archived",
};

export type CaseStudyCardProps = {
  caseStudy: CaseStudy;
};

// One card per Case Study, inline in the `experience` section (DD-01 — no
// per-project route). Each §3.4 H2 gets its own anchor target for deep
// linking (`#experience-<id>-<key>`), even though nothing routes there yet.
export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  return (
    <article id={caseStudy.anchor} className="scroll-mt-24 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-text">{caseStudy.title}</h3>
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-text-muted">
            {STATUS_LABEL[caseStudy.status]}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          {caseStudy.category} · {caseStudy.period}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {caseStudy.tech.map((tech) => (
            <span key={tech} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">
              {tech}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-6">
        {caseStudy.sections.map((part) => (
          <div key={part.key} id={part.anchor} className="scroll-mt-24">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{part.heading}</h4>
            <div
              className="prose-content mt-2 max-w-none text-text"
              dangerouslySetInnerHTML={{ __html: part.html }}
            />
          </div>
        ))}
      </div>
    </article>
  );
}
