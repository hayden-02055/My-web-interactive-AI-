import type { Section } from "@/types/content";

export type HeroSectionProps = {
  section: Pick<Section, "anchor" | "title" | "html">;
};

// PRD §8.1 — dual CTA: "Explore My Work" scrolls to Experience, "Ask My AI"
// scrolls to the (inert, DD-04) agent slot. Both are same-page anchors, so
// this never issues a network request even before the Agent exists.
export function HeroSection({ section }: HeroSectionProps) {
  return (
    <section id={section.anchor} className="scroll-mt-24 border-b border-border py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">{section.title}</h1>
      <div
        className="prose-content mt-6 max-w-none text-text-muted"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="#experience"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          Explore My Work
        </a>
        <a
          href="#agent-slot"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
        >
          Ask My AI
        </a>
      </div>
    </section>
  );
}
