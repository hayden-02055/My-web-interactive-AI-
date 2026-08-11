import { SectionTitle } from "@/components/ui/SectionTitle";
import type { CaseStudy } from "@/types/content";
import { CaseStudyCard } from "./CaseStudyCard";

export type CaseStudyListProps = {
  caseStudies: CaseStudy[];
};

// The `experience` section is a container, not a content file (§3.1) — Case
// Studies are inlined here rather than routed (DD-01).
export function CaseStudyList({ caseStudies }: CaseStudyListProps) {
  return (
    <section id="experience" data-agent-section="experience" className="scroll-mt-24 border-b border-border py-16">
      <SectionTitle>Experience</SectionTitle>
      <div className="mt-8 flex flex-col gap-12">
        {caseStudies.map((caseStudy) => (
          <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
        ))}
      </div>
    </section>
  );
}
