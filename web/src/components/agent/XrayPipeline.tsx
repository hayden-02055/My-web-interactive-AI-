"use client";

import { useState } from "react";
import type { AssistantMessage, TraceStep } from "@/lib/agent/types";
import { XrayDetail } from "./XrayDetail";

// SDD-06 DD-29 — 5 fixed slots, pre-arranged by the client; only the ones
// the server actually reports (via `trace.step`) ever leave the "pending" look.
const SLOTS: { stage: TraceStep["stage"]; label: string }[] = [
  { stage: "understanding", label: "Understanding" },
  { stage: "finding_context", label: "Finding Context" },
  { stage: "retrieving_experience", label: "Retrieving Experience" },
  { stage: "selecting_action", label: "Selecting Action" },
  { stage: "generating_answer", label: "Generating Answer" },
];

export type XrayPipelineProps = {
  message: AssistantMessage;
  isFirstAssistantMessage: boolean;
};

// DD-31 — expanded while streaming; collapses to a one-line summary once
// done, except the very first assistant message in the conversation (stays
// open once, so the feature gets discovered at all). A manual toggle always
// wins over that default afterward.
export function XrayPipeline({ message, isFirstAssistantMessage }: XrayPipelineProps) {
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);

  if (message.trace.length === 0) return null;

  const autoExpanded = message.status === "streaming" || isFirstAssistantMessage;
  const expanded = userExpanded ?? autoExpanded;

  const byStage = new Map<TraceStep["stage"], TraceStep[]>();
  for (const step of message.trace) {
    const list = byStage.get(step.stage) ?? [];
    list.push(step);
    byStage.set(step.stage, list);
  }

  const filledSlots = SLOTS.filter((slot) => byStage.has(slot.stage)).length;
  const totalDurationMs = message.trace.reduce((sum, step) => sum + (step.duration_ms ?? 0), 0);

  return (
    <div className="mb-2 rounded-xl border border-border bg-surface text-[11px]">
      <button
        type="button"
        onClick={() => setUserExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-text-muted"
      >
        <span>{expanded ? "Process" : `${filledSlots} steps · ${totalDurationMs}ms`}</span>
        <span aria-hidden>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? (
        <div className="flex flex-col gap-1 border-t border-border px-2.5 py-2">
          {SLOTS.map((slot) => (
            <XraySlot key={slot.stage} label={slot.label} steps={byStage.get(slot.stage) ?? []} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function XraySlot({ label, steps }: { label: string; steps: TraceStep[] }) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-0.5 text-text-muted/50">
        <StatusIcon status="pending" />
        {label}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {steps.map((step) => (
        <XrayStepRow key={step.id} step={step} label={label} />
      ))}
    </div>
  );
}

function XrayStepRow({ step, label }: { step: TraceStep; label: string }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const canExpand = step.detail !== null && step.detail !== undefined;

  return (
    <div>
      <button
        type="button"
        onClick={() => canExpand && setDetailOpen((v) => !v)}
        disabled={!canExpand}
        className={`flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left ${
          canExpand ? "hover:bg-surface-muted" : "cursor-default"
        } ${step.status === "skipped" ? "text-text-muted/60" : "text-text"}`}
      >
        <span className="flex items-center gap-1.5">
          <StatusIcon status={step.status} />
          {label}
        </span>
        <span className="text-text-muted">{statusText(step)}</span>
      </button>
      {detailOpen ? <XrayDetail step={step} /> : null}
    </div>
  );
}

function statusText(step: TraceStep): string {
  switch (step.status) {
    case "started":
      return "In progress";
    case "completed":
      return step.duration_ms !== null && step.duration_ms !== undefined ? `${step.duration_ms}ms` : "Done";
    case "skipped":
      return "Skipped";
    case "failed":
      return "Failed";
  }
}

// Glyph, not just color, carries the status — accessible without relying on
// a "danger" color this project's token set (§4.3) doesn't have.
function StatusIcon({ status }: { status: TraceStep["status"] | "pending" }) {
  if (status === "completed") return <span aria-hidden>{"✓"}</span>;
  if (status === "failed") return <span aria-hidden>{"✕"}</span>;
  if (status === "started") return <span aria-hidden className="inline-block animate-pulse">{"●"}</span>;
  return (
    <span aria-hidden className="text-text-muted/50">
      {"○"}
    </span>
  );
}
