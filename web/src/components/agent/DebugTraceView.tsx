import type { AssistantMessage } from "@/lib/agent/types";

// §6.3 — trace/suggestions/blocks are collected in state but not rendered
// as real UI by this SDD (SDD-05/06/07's job). This exists only to verify
// DoD 9.1 without building throwaway UI. `NODE_ENV === "production"` is
// statically replaced by Next's build, so this branch (and the JSON dump
// below it) is dead-code-eliminated from the production bundle.
export function DebugTraceView({ message }: { message: AssistantMessage }) {
  if (process.env.NODE_ENV === "production") return null;
  if (message.trace.length === 0 && message.suggestions.length === 0 && message.blocks.length === 0) {
    return null;
  }

  return (
    <details className="mt-1 rounded-lg border border-dashed border-border bg-surface-muted p-2 text-[10px] text-text-muted">
      <summary className="cursor-pointer">debug: trace / suggestions / blocks</summary>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(
          { intent: message.intent, trace: message.trace, suggestions: message.suggestions, blocks: message.blocks },
          null,
          2,
        )}
      </pre>
    </details>
  );
}
