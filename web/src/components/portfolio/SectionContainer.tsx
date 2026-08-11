import type { Section } from "@/types/content";

export type SectionContainerProps = {
  section: Pick<Section, "anchor" | "title" | "html">;
};

export function SectionContainer({ section }: SectionContainerProps) {
  return (
    <section
      id={section.anchor}
      data-agent-section={section.anchor}
      className="scroll-mt-24 border-b border-border py-16 last:border-b-0"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-text">{section.title}</h2>
      <div
        className="prose-content mt-6 max-w-none text-text-muted"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />
    </section>
  );
}
