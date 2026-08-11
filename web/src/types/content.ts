// Content contract — see docs/sdd/SDD-01-content-and-static-site.md §3.
// Mirrors the Python-side contract SDD-02 will build against. Keep both in sync by hand.

export type CaseStudyStatus = "shipped" | "in-progress" | "prototype" | "archived";

export type SectionFrontmatter = {
  id: string;
  title: string;
  nav_label: string;
  order: number;
  summary: string;
  retrievable: boolean;
  keywords?: string[];
};

export type CaseStudyFrontmatter = {
  id: string;
  title: string;
  category: string;
  status: CaseStudyStatus;
  period: string;
  order: number;
  summary: string;
  tech: string[];
  retrievable: boolean;
};

// Keys of the §3.4 closed H2 set.
export type CaseStudyHeadingKey =
  | "overview"
  | "problem"
  | "role"
  | "constraints"
  | "solution"
  | "architecture"
  | "decisions"
  | "result"
  | "learned";

export type CaseStudySectionContent = {
  key: CaseStudyHeadingKey;
  heading: string;
  anchor: string;
  html: string;
  // Raw Markdown body of this H2 (pre-render) — SDD-02 §4.1 `content`/`embed_text`
  // need plain source text, not rendered HTML.
  text: string;
};

export type Section = SectionFrontmatter & {
  anchor: string;
  html: string;
  // Raw Markdown body (pre-render) — see CaseStudySectionContent.text.
  text: string;
};

export type CaseStudy = CaseStudyFrontmatter & {
  anchor: string;
  sections: CaseStudySectionContent[];
};
