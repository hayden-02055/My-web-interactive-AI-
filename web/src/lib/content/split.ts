export type MarkdownH2Chunk = {
  heading: string;
  content: string;
};

// Splits a Case Study body into one chunk per top-level (##) heading.
// Deliberately line-based, not AST-based: DD-02 treats the closed H2 set as
// the chunk boundary, so a simple line scan is enough and stays easy to port.
export function splitByH2(body: string): MarkdownH2Chunk[] {
  const lines = body.split(/\r?\n/);
  const chunks: MarkdownH2Chunk[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = /^## (.+)$/.exec(line);
    if (match) {
      if (current) {
        chunks.push({ heading: current.heading, content: current.lines.join("\n").trim() });
      }
      current = { heading: match[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    chunks.push({ heading: current.heading, content: current.lines.join("\n").trim() });
  }

  return chunks;
}
