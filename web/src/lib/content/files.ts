import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// Resolved relative to the process cwd, which is always `web/` — both for
// `next build`/`next dev` and for `pnpm validate:content` (package.json
// scripts run with cwd = the package root).
export const CONTENT_ROOT = path.join(process.cwd(), "src/content");
export const SECTIONS_DIR = path.join(CONTENT_ROOT, "sections");
export const CASE_STUDIES_DIR = path.join(CONTENT_ROOT, "case-studies");

export type ContentFile = {
  filePath: string;
  fileId: string;
  frontmatter: unknown;
  body: string;
};

export function readMarkdownFiles(dir: string): ContentFile[] {
  return fs
    .readdirSync(dir)
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => {
      const filePath = path.join(dir, filename);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      return {
        filePath: path.relative(CONTENT_ROOT, filePath),
        fileId: filename.replace(/\.md$/, ""),
        frontmatter: data,
        body: content,
      };
    });
}
