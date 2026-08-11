import fs from "node:fs";
import path from "node:path";

// SDD-08 D-59 / INV-06 — scans only `.next/static` (what actually ships to
// the browser). `.next/server` legitimately never reaches a client, so
// scanning it would just produce false positives about code that's fine.
//
// This project's client bundle has no legitimate reason to reference any
// backend secret: `web/` only ever talks to the API over HTTP
// (`NEXT_PUBLIC_API_BASE_URL`), never imports `api/`. Finding any of these
// patterns means something leaked, not a false positive to explain away.

const STATIC_DIR = path.join(process.cwd(), ".next", "static");

// Server-only env var names (api/.env.example) that must never appear
// literally in client-shipped JS — Next only ever inlines NEXT_PUBLIC_* vars,
// so a bare occurrence of one of these names is itself suspicious.
const FORBIDDEN_NAMES = [
  "LLM_API_KEY",
  "EMBEDDING_API_KEY",
  "REDIS_URL",
  "GLOBAL_DAILY_LIMIT",
  "SESSION_TTL_SECONDS",
];

// Common secret-key value shapes (OpenAI, generic bearer-token-looking strings).
const SECRET_VALUE_PATTERNS = [/sk-[A-Za-z0-9_-]{16,}/, /sk-ant-[A-Za-z0-9_-]{16,}/];

function listJsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

function main(): void {
  const files = listJsFiles(STATIC_DIR);
  if (files.length === 0) {
    console.error(`error: no .js files found under ${STATIC_DIR} — run \`pnpm build\` first`);
    process.exit(1);
  }

  const problems: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const relPath = path.relative(process.cwd(), file);

    for (const name of FORBIDDEN_NAMES) {
      if (content.includes(name)) {
        problems.push(`${relPath}: contains forbidden env var name "${name}"`);
      }
    }
    for (const pattern of SECRET_VALUE_PATTERNS) {
      const match = content.match(pattern);
      if (match !== null) {
        problems.push(`${relPath}: matches secret-key-shaped pattern (${pattern}): "${match[0].slice(0, 12)}..."`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`✗ found ${problems.length} potential secret leak(s) in the client bundle:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(`✓ no secrets found in ${files.length} client bundle file(s)`);
}

main();
