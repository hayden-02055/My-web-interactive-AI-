import { AgentPanel } from "@/components/agent/AgentPanel";
import { AgentProvider } from "@/components/agent/AgentProvider";
import { CaseStudyList } from "@/components/portfolio/CaseStudyList";
import { HeroSection } from "@/components/portfolio/HeroSection";
import { PortfolioLayout } from "@/components/portfolio/PortfolioLayout";
import { SectionContainer } from "@/components/portfolio/SectionContainer";
import { SectionNav } from "@/components/portfolio/SectionNav";
import { getCaseStudies, getSections } from "@/lib/content";

// Single route, anchor-scroll navigation (DD-01) — Case Studies are inlined
// under `experience` rather than routed, so this file owns the whole page.
export default function Home() {
  const sections = getSections();
  const caseStudies = getCaseStudies();

  const hero = sections.find((section) => section.id === "hero")!;
  const contact = sections.find((section) => section.id === "contact")!;
  const middleSections = sections.filter((section) => section.id !== "hero" && section.id !== "contact");

  const navItems = [
    { id: hero.anchor, label: hero.nav_label },
    ...middleSections.map((section) => ({ id: section.anchor, label: section.nav_label })),
    { id: "experience", label: "Experience" },
    { id: contact.anchor, label: contact.nav_label },
  ];

  return (
    <AgentProvider>
      <PortfolioLayout
        nav={<SectionNav items={navItems} />}
        content={
          <>
            <HeroSection section={hero} />
            {middleSections.map((section) => (
              <SectionContainer key={section.id} section={section} />
            ))}
            <CaseStudyList caseStudies={caseStudies} />
            <SectionContainer section={contact} />
          </>
        }
        agentSlot={<AgentPanel />}
      />
    </AgentProvider>
  );
}
