import { CASE_STUDIES_DIR, SECTIONS_DIR, readMarkdownFiles } from "../src/lib/content/files";
import { splitByH2 } from "../src/lib/content/split";
import { type RawCaseStudyFile, type RawSectionFile, validateContent } from "../src/lib/content/validate";

// CI entry point — SDD-01 §4.2 (`pnpm validate:content`), a precondition of `pnpm build`.

const sectionFiles = readMarkdownFiles(SECTIONS_DIR);
const caseStudyFiles = readMarkdownFiles(CASE_STUDIES_DIR);

const rawSections: RawSectionFile[] = sectionFiles.map((f) => ({
  filePath: f.filePath,
  fileId: f.fileId,
  frontmatter: f.frontmatter,
}));

const rawCaseStudies: RawCaseStudyFile[] = caseStudyFiles.map((f) => ({
  filePath: f.filePath,
  fileId: f.fileId,
  frontmatter: f.frontmatter,
  headings: splitByH2(f.body).map((c) => c.heading),
}));

const issues = validateContent(rawSections, rawCaseStudies);

if (issues.length > 0) {
  console.error(`✗ content validation failed (${issues.length} issue${issues.length > 1 ? "s" : ""})\n`);
  for (const issue of issues) {
    console.error(`  [${issue.rule}] ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(`✓ content validation passed (${sectionFiles.length} sections, ${caseStudyFiles.length} case studies)`);
