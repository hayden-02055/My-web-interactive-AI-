import { z } from "zod";
import { CASE_STUDY_HEADINGS } from "./anchors";

// SDD-01 §4.1 — decision rules, tagged by their V-## id so failures are
// traceable back to the spec table instead of a generic "invalid" message.

const CASE_STUDY_STATUSES = ["shipped", "in-progress", "prototype", "archived"] as const;

const sectionFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  nav_label: z.string(),
  order: z.number().int(),
  summary: z.string(),
  retrievable: z.boolean(),
  keywords: z.array(z.string()).optional(),
});

const caseStudyFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  status: z.string(),
  period: z.string(),
  order: z.number().int(),
  summary: z.string(),
  tech: z.array(z.string()),
  retrievable: z.boolean(),
});

export type ValidationIssue = {
  file: string;
  rule: string;
  message: string;
};

export type RawSectionFile = {
  filePath: string;
  fileId: string;
  frontmatter: unknown;
};

export type RawCaseStudyFile = {
  filePath: string;
  fileId: string;
  frontmatter: unknown;
  headings: string[];
};

export function validateContent(sections: RawSectionFile[], caseStudies: RawCaseStudyFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idOwners = new Map<string, string[]>();
  const registerId = (id: string, filePath: string) => {
    idOwners.set(id, [...(idOwners.get(id) ?? []), filePath]);
  };

  const sectionOrders = new Map<number, string[]>();
  for (const file of sections) {
    const result = sectionFrontmatterSchema.safeParse(file.frontmatter);
    if (!result.success) {
      pushSchemaIssues(issues, file.filePath, result.error);
      continue;
    }
    const fm = result.data;

    if (fm.id !== file.fileId) {
      issues.push({ file: file.filePath, rule: "V-02", message: `id "${fm.id}" does not match filename "${file.fileId}"` });
    }
    if (!fm.summary.trim()) {
      issues.push({ file: file.filePath, rule: "V-09", message: "summary is empty" });
    }
    registerId(fm.id, file.filePath);
    sectionOrders.set(fm.order, [...(sectionOrders.get(fm.order) ?? []), file.filePath]);
  }
  pushDuplicateOrderIssues(issues, sectionOrders, "sections");

  const caseStudyOrders = new Map<number, string[]>();
  for (const file of caseStudies) {
    const result = caseStudyFrontmatterSchema.safeParse(file.frontmatter);
    if (result.success) {
      const fm = result.data;

      if (fm.id !== file.fileId) {
        issues.push({ file: file.filePath, rule: "V-02", message: `id "${fm.id}" does not match filename "${file.fileId}"` });
      }
      if (!fm.summary.trim()) {
        issues.push({ file: file.filePath, rule: "V-09", message: "summary is empty" });
      }
      if (!CASE_STUDY_STATUSES.includes(fm.status as (typeof CASE_STUDY_STATUSES)[number])) {
        issues.push({
          file: file.filePath,
          rule: "V-05",
          message: `status "${fm.status}" is not one of ${CASE_STUDY_STATUSES.join(", ")}`,
        });
      }
      registerId(fm.id, file.filePath);
      caseStudyOrders.set(fm.order, [...(caseStudyOrders.get(fm.order) ?? []), file.filePath]);
    } else {
      pushSchemaIssues(issues, file.filePath, result.error);
    }

    validateCaseStudyHeadings(file, issues);
  }
  pushDuplicateOrderIssues(issues, caseStudyOrders, "case-studies");

  for (const [id, files] of idOwners) {
    if (files.length > 1) {
      issues.push({ file: files.join(", "), rule: "V-03", message: `duplicate id "${id}" across content` });
    }
  }

  return issues;
}

function pushSchemaIssues(issues: ValidationIssue[], filePath: string, error: z.ZodError) {
  for (const issue of error.issues) {
    issues.push({
      file: filePath,
      rule: "V-01",
      message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    });
  }
}

function pushDuplicateOrderIssues(issues: ValidationIssue[], orders: Map<number, string[]>, collection: string) {
  for (const [order, files] of orders) {
    if (files.length > 1) {
      issues.push({ file: files.join(", "), rule: "V-04", message: `duplicate order ${order} in ${collection}` });
    }
  }
}

function validateCaseStudyHeadings(file: RawCaseStudyFile, issues: ValidationIssue[]) {
  const validHeadings = new Set(CASE_STUDY_HEADINGS.map((h) => h.heading));
  const orderByHeading = new Map(CASE_STUDY_HEADINGS.map((h) => [h.heading, h.order]));

  for (const heading of file.headings) {
    if (!validHeadings.has(heading)) {
      issues.push({ file: file.filePath, rule: "V-06", message: `unknown H2 heading "${heading}"` });
    }
  }

  const present = new Set(file.headings);
  for (const spec of CASE_STUDY_HEADINGS) {
    if (spec.required && !present.has(spec.heading)) {
      issues.push({ file: file.filePath, rule: "V-07", message: `missing required H2 "${spec.heading}"` });
    }
  }

  const knownOrders = file.headings.filter((h) => validHeadings.has(h)).map((h) => orderByHeading.get(h)!);
  const isStrictlyAscending = knownOrders.every((value, index) => index === 0 || value > knownOrders[index - 1]);
  if (!isStrictlyAscending) {
    issues.push({ file: file.filePath, rule: "V-08", message: `H2 order does not match §3.4 (${file.headings.join(" > ")})` });
  }
}
