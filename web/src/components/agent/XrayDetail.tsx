import type { TraceStep } from "@/lib/agent/types";
import { navigateToAnchor } from "@/lib/agent/navigate";

// SDD-06 DD-30 — an explicit allow-list per stage, never a generic
// `Object.entries(detail)` dump. An unrecognized field (or a whole
// unrecognized stage) is silently ignored here, on purpose (INV-05): the
// backend's Pydantic models are the other half of this allow-list pair
// (SDD-03 §5.9) — if this file rendered anything it received, that
// server-side guarantee would stop meaning anything on the client.
export function XrayDetail({ step }: { step: TraceStep }) {
  const detail = step.detail;
  if (detail === null || detail === undefined) return null;

  const content = renderDetail(step.stage, detail);
  if (content === null) return null;

  return <div className="mt-0.5 ml-4 border-l border-border py-1 pl-2 text-text-muted">{content}</div>;
}

function renderDetail(stage: TraceStep["stage"], detail: NonNullable<TraceStep["detail"]>) {
  switch (stage) {
    case "understanding": {
      if (!("message_chars" in detail)) return null;
      return (
        <p>
          {detail.message_chars} chars · {detail.history_turns} prior turn{detail.history_turns === 1 ? "" : "s"}
        </p>
      );
    }

    case "finding_context": {
      if (!("resolved" in detail)) return null;
      if (!detail.resolved) return <p>No page context.</p>;
      return (
        <p>
          section: {detail.section ?? "—"}
          {detail.case_study !== null ? ` · case study: ${detail.case_study}` : ""}
        </p>
      );
    }

    case "retrieving_experience": {
      if (!("result_count" in detail)) return null;
      if (detail.result_count === 0) {
        return <p>Searched — no results above the relevance threshold ({detail.min_score.toFixed(2)}).</p>;
      }
      return (
        <ul className="flex flex-col gap-0.5">
          {detail.results.map((result) => (
            <li key={result.anchor}>
              <button
                type="button"
                onClick={() => navigateToAnchor(result.anchor)}
                className="underline hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {result.label}
              </button>{" "}
              <span>({result.score.toFixed(2)})</span>
            </li>
          ))}
        </ul>
      );
    }

    case "selecting_action": {
      if (!("tools" in detail)) return null;
      if (detail.tools.length === 0) return null;
      return (
        <ul className="flex flex-col gap-0.5">
          {detail.tools.map((tool, index) => (
            <li key={`${tool.name}-${index}`}>
              {tool.name} — {tool.status} ({tool.duration_ms}ms)
            </li>
          ))}
        </ul>
      );
    }

    case "generating_answer": {
      if (!("model" in detail)) return null;
      return (
        <p>
          {detail.model} · {detail.output_tokens} tokens
        </p>
      );
    }

    default:
      return null;
  }
}
