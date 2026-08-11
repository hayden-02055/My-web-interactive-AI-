import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CASE_STUDY_STATUS_LABEL } from "../src/lib/content/labels";
import { getCaseStudies, getSections } from "../src/lib/content/loader";
import type { CaseStudy, Section } from "../src/types/content";

// SDD-02 D-11 — reuses the SDD-01 loader/anchor tables (DD-06: parsing stays
// TS-only, Python only embeds). Never re-parse Markdown here.

const REPO_ROOT = path.join(process.cwd(), "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "api/data/knowledge.source.json");

type KnowledgeChunk = {
  id: string;
  section: string;
  anchor: string;
  label: string;
  content: string;
  embed_text: string;
  content_hash: string;
};

function contentHash(embedText: string): string {
  return `sha256:${createHash("sha256").update(embedText, "utf-8").digest("hex")}`;
}

function composeEmbedText(header: string, body: string, options: { category?: string; keywords?: string[] } = {}) {
  const lines = [`[${header}]`];
  if (options.category) lines.push(`category: ${options.category}`);
  if (options.keywords && options.keywords.length > 0) lines.push(`keywords: ${options.keywords.join(", ")}`);
  return `${lines.join("\n")}\n\n${body}`;
}

function buildSectionChunk(section: Section): KnowledgeChunk {
  const embedText = composeEmbedText(section.title, section.text, { keywords: section.keywords });
  return {
    id: section.anchor,
    section: section.id,
    anchor: section.anchor,
    label: section.nav_label,
    content: section.text,
    embed_text: embedText,
    content_hash: contentHash(embedText),
  };
}

// DD-07 — one card chunk per Case Study, synthesized from frontmatter, so a
// broad "what did you do at Fingoo" query has an overview-level chunk to
// match instead of only landing on a single H2 section.
function buildCardChunk(caseStudy: CaseStudy): KnowledgeChunk {
  const statusLabel = CASE_STUDY_STATUS_LABEL[caseStudy.status];
  const content = `${caseStudy.title} (${caseStudy.category}, ${statusLabel}, ${caseStudy.period}). ${caseStudy.summary.trim()} Tech: ${caseStudy.tech.join(", ")}.`;
  const embedText = composeEmbedText(caseStudy.title, content, {
    category: caseStudy.category,
    keywords: caseStudy.tech,
  });
  return {
    id: caseStudy.anchor,
    section: "experience",
    anchor: caseStudy.anchor,
    label: caseStudy.title,
    content,
    embed_text: embedText,
    content_hash: contentHash(embedText),
  };
}

function buildCaseStudySectionChunks(caseStudy: CaseStudy): KnowledgeChunk[] {
  return caseStudy.sections.map((part) => {
    const label = `${caseStudy.title} — ${part.heading}`;
    // No `keywords: tech` here (unlike the card chunk): repeating the full
    // tech stack identically on every H2 of a case study made all of that
    // project's chunks look near-identical in embedding space, burying the
    // section-specific body text under shared boilerplate — measured via
    // scripts/calibrate_retrieval.py (specific-query top-1 dropped sharply
    // when this was present).
    const embedText = composeEmbedText(label, part.text, { category: caseStudy.category });
    return {
      id: part.anchor,
      section: "experience",
      anchor: part.anchor,
      label,
      content: part.text,
      embed_text: embedText,
      content_hash: contentHash(embedText),
    };
  });
}

function buildChunks(): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  // `hero` is retrievable: false (SDD-01 §3.2) — excluded here, not just at
  // query time, so it never becomes an embedding cost or a citable source.
  for (const section of getSections()) {
    if (!section.retrievable) continue;
    chunks.push(buildSectionChunk(section));
  }

  for (const caseStudy of getCaseStudies()) {
    if (!caseStudy.retrievable) continue;
    chunks.push(buildCardChunk(caseStudy));
    chunks.push(...buildCaseStudySectionChunks(caseStudy));
  }

  chunks.sort((a, b) => a.id.localeCompare(b.id));
  return chunks;
}

function loadExistingChunks(): KnowledgeChunk[] | null {
  if (!fs.existsSync(OUTPUT_PATH)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
    if (typeof parsed === "object" && parsed !== null && "chunks" in parsed) {
      return (parsed as { chunks: KnowledgeChunk[] }).chunks;
    }
  } catch {
    // fall through to null — treated as "no prior output"
  }
  return null;
}

function main() {
  const chunks = buildChunks();

  // `generated_at` only advances when content actually changed. Otherwise a
  // wall-clock timestamp would make every regeneration diff against the
  // committed file even with zero content change, defeating §7.1 Stage A
  // (`git diff --exit-code`) and the DD-09 "diff noise" goal it shares.
  const existingChunks = loadExistingChunks();
  const unchanged = existingChunks !== null && JSON.stringify(existingChunks) === JSON.stringify(chunks);
  const generatedAt = unchanged ? JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8")).generated_at : new Date().toISOString();

  const output = {
    schema_version: 1,
    generated_at: generatedAt,
    chunks,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf-8");

  console.log(`✓ wrote ${chunks.length} chunks to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

main();
