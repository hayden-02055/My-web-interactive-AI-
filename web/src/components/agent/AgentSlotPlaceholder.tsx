// Inert placeholder — DD-04: the Agent slot's layout is fixed here so SDD-04
// only has to fill this component in, without reflowing the left column.
export function AgentSlotPlaceholder() {
  return (
    <div
      id="agent-slot"
      className="scroll-mt-24 flex h-[420px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted px-6 text-center"
    >
      <p className="text-sm font-medium text-text">AI Agent</p>
      <p className="text-xs text-text-muted">Coming soon — 이 자리에 대화형 Agent가 연결됩니다.</p>
    </div>
  );
}
