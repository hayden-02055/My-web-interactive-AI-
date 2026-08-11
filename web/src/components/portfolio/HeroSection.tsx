import type { Section } from "@/types/content";
import { Button } from "@/components/ui/Button";

export type HeroSectionProps = {
  section: Pick<Section, "anchor" | "title" | "html">;
};

// PRD §8.1 — dual CTA: "Explore My Work" scrolls to Experience, "Ask My AI"
// scrolls to the (inert, DD-04) agent slot. Both are same-page anchors, so
// this never issues a network request even before the Agent exists.
export function HeroSection({ section }: HeroSectionProps) {
  return (
    <section id={section.anchor} className="scroll-mt-24 border-b border-border py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">{section.title}</h1>
      <div
        className="prose-content mt-6 max-w-none text-text-muted"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="#experience" variant="primary">
          Explore My Work
        </Button>
        <Button href="#agent-slot" variant="secondary">
          Ask My AI
        </Button>
      </div>
    </section>
  );
}
