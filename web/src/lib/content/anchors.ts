import type { CaseStudyHeadingKey } from "../../types/content";

export type CaseStudyHeadingSpec = {
  order: number;
  heading: string;
  key: CaseStudyHeadingKey;
  required: boolean;
};

// Single source of truth for SDD-01 §3.4. TS (here) and the future Python
// index builder (SDD-02) must both read this table — DD-03: anchors are a
// fixed lookup, never a slugified heading, so the two languages can't drift.
export const CASE_STUDY_HEADINGS: CaseStudyHeadingSpec[] = [
  { order: 1, heading: "Overview", key: "overview", required: true },
  { order: 2, heading: "Problem", key: "problem", required: true },
  { order: 3, heading: "My Role", key: "role", required: true },
  { order: 4, heading: "Constraints", key: "constraints", required: false },
  { order: 5, heading: "Solution", key: "solution", required: true },
  { order: 6, heading: "Architecture", key: "architecture", required: false },
  { order: 7, heading: "Key Decisions", key: "decisions", required: true },
  { order: 8, heading: "Result", key: "result", required: true },
  { order: 9, heading: "What I Learned", key: "learned", required: false },
];

export function sectionAnchor(sectionId: string): string {
  return sectionId;
}

export function caseStudyAnchor(caseStudyId: string): string {
  return `experience-${caseStudyId}`;
}

export function caseStudyHeadingAnchor(caseStudyId: string, key: CaseStudyHeadingKey): string {
  return `experience-${caseStudyId}-${key}`;
}
