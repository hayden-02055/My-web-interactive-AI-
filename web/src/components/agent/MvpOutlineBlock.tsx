import type { AnswerBlock } from "@/lib/agent/types";
import { SuggestionCard } from "./SuggestionCard";

// PRD §9.4 — the Agent never confirms pricing or timelines; shown even when
// the model didn't return any caveats of its own (SDD-07 §3.3).
const DEFAULT_CAVEAT = "This is a rough scope sketch, not a formal estimate — pricing and timelines aren't set here.";

function humanizeId(id: string): string {
  return id
    .split("-")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export type MvpOutlineBlockProps = { block: AnswerBlock };

// SDD-07 D-49/50 — a structured render, never prose. DD-33: Case Study
// links reuse SuggestionCard verbatim so the interaction (and DD-26/27/28's
// rules) don't have to be relearned for a second "card" type.
export function MvpOutlineBlock({ block }: MvpOutlineBlockProps) {
  const { data } = block;
  const caveats = data.caveats.length > 0 ? data.caveats : [DEFAULT_CAVEAT];

  return (
    <div className="mb-2 flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-xs">
      <p className="text-sm font-medium text-text">{data.goal}</p>

      {data.pipeline.length > 0 ? (
        <div>
          <p className="font-medium text-text-muted">Pipeline</p>
          <ol className="ml-4 list-decimal text-text">
            {data.pipeline.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {data.mvp_scope.length > 0 ? (
        <div>
          <p className="font-medium text-text-muted">MVP Scope</p>
          <ul className="ml-4 list-disc text-text">
            {data.mvp_scope.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.relevant_case_studies.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="font-medium text-text-muted">Relevant Experience</p>
          {data.relevant_case_studies.map((id) => (
            <SuggestionCard
              key={id}
              suggestion={{ type: "section", label: humanizeId(id), target: `#experience-${id}`, reason: "" }}
            />
          ))}
        </div>
      ) : null}

      <div className="border-t border-border pt-2">
        <ul className="ml-4 list-disc text-text-muted">
          {caveats.map((caveat, index) => (
            <li key={index}>{caveat}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
