import type {
  CaseStudy,
  CaseStudyFrontmatter,
  CaseStudyHeadingKey,
  Section,
  SectionFrontmatter,
} from "../../types/content";
import { CASE_STUDY_HEADINGS, caseStudyAnchor, caseStudyHeadingAnchor, sectionAnchor } from "./anchors";
import { CASE_STUDIES_DIR, SECTIONS_DIR, readMarkdownFiles } from "./files";
import { renderMarkdown } from "./markdown";
import { splitByH2 } from "./split";
import { type RawCaseStudyFile, type RawSectionFile, validateContent } from "./validate";

const HEADING_KEY_BY_TEXT = new Map<string, CaseStudyHeadingKey>(CASE_STUDY_HEADINGS.map((h) => [h.heading, h.key]));

type LoadedContent = {
  sections: Section[];
  caseStudies: CaseStudy[];
};

let cache: LoadedContent | null = null;

function load(): LoadedContent {
  const sectionFiles = readMarkdownFiles(SECTIONS_DIR);
  const caseStudyFiles = readMarkdownFiles(CASE_STUDIES_DIR);
  const caseStudyChunks = caseStudyFiles.map((file) => ({ file, chunks: splitByH2(file.body) }));

  const rawSections: RawSectionFile[] = sectionFiles.map((f) => ({
    filePath: f.filePath,
    fileId: f.fileId,
    frontmatter: f.frontmatter,
  }));
  const rawCaseStudies: RawCaseStudyFile[] = caseStudyChunks.map(({ file, chunks }) => ({
    filePath: file.filePath,
    fileId: file.fileId,
    frontmatter: file.frontmatter,
    headings: chunks.map((c) => c.heading),
  }));

  const issues = validateContent(rawSections, rawCaseStudies);
  if (issues.length > 0) {
    const formatted = issues.map((i) => `  [${i.rule}] ${i.file}: ${i.message}`).join("\n");
    throw new Error(`Content validation failed (run \`pnpm validate:content\` for details):\n${formatted}`);
  }

  const sections: Section[] = sectionFiles
    .map((f) => {
      const fm = f.frontmatter as SectionFrontmatter;
      return { ...fm, anchor: sectionAnchor(fm.id), html: renderMarkdown(f.body) };
    })
    .sort((a, b) => a.order - b.order);

  const caseStudies: CaseStudy[] = caseStudyChunks
    .map(({ file, chunks }) => {
      const fm = file.frontmatter as CaseStudyFrontmatter;
      return {
        ...fm,
        anchor: caseStudyAnchor(fm.id),
        sections: chunks.map((chunk) => {
          const key = HEADING_KEY_BY_TEXT.get(chunk.heading)!;
          return {
            key,
            heading: chunk.heading,
            anchor: caseStudyHeadingAnchor(fm.id, key),
            html: renderMarkdown(chunk.content),
          };
        }),
      };
    })
    .sort((a, b) => a.order - b.order);

  return { sections, caseStudies };
}

function getContent(): LoadedContent {
  if (!cache) cache = load();
  return cache;
}

export function getSections(): Section[] {
  return getContent().sections;
}

export function getCaseStudies(): CaseStudy[] {
  return getContent().caseStudies;
}
