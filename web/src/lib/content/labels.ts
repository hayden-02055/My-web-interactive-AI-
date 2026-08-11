import type { CaseStudyStatus } from "../../types/content";

// Shared between the UI (CaseStudyCard) and the knowledge-source builder
// (SDD-02 §DD-07 card chunk) so the human-readable status text can't drift.
export const CASE_STUDY_STATUS_LABEL: Record<CaseStudyStatus, string> = {
  shipped: "Shipped",
  "in-progress": "In Progress",
  prototype: "Prototype",
  archived: "Archived",
};
