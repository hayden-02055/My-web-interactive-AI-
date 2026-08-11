"use client";

import { Chip } from "@/components/ui/Chip";
import { STARTER_PROMPTS } from "@/lib/agent/starterPrompts";
import { useAgent } from "./AgentProvider";

// SDD-05 D-44 (O-18) — fills the composer only; never sends (INV-04).
export function StarterPrompts() {
  const { setComposerValue } = useAgent();

  return (
    <div className="flex flex-wrap gap-1.5">
      {STARTER_PROMPTS.map((prompt) => (
        <Chip key={prompt} size="action" onClick={() => setComposerValue(prompt)}>
          {prompt}
        </Chip>
      ))}
    </div>
  );
}
