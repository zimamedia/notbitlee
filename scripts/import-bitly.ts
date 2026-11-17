// Imports a Bitly CSV export into your D1 database from the command line.
// Usage: npm run import:bitly -- path/to/export.csv [--remote]
// Smaller files are easier to import from the dashboard: Settings > Import from Bitly.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { importBitlyCsv, type ImportedLink } from "../shared/import-links.ts";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("Usage: npm run import:bitly -- path/to/export.csv [--remote]");
  process.exit(1);
}

const links = importBitlyCsv(readFileSync(file, "utf8"));
const dir = mkdtempSync(join(tmpdir(), "notbitlee-"));
const sqlFile = join(dir, "import.sql");
writeFileSync(sqlFile, `${links.map((link) => insertLink(link)).join("\n")}\n`);
console.log(`Found ${links.length} links. Slugs that already exist are skipped.`);

try {
  execFileSync("npx", ["wrangler", "d1", "execute", "DB", remote ? "--remote" : "--local", "--yes", "--file", sqlFile], {
    stdio: ["inherit", "ignore", "inherit"],
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

function insertLink(link: ImportedLink): string {
  return `INSERT OR IGNORE INTO links (slug, title, destination, created_at, updated_at, archived, created_by, imported_from, bitly_engagements) VALUES (${[
    sqlString(link.slug),
    sqlString(link.title),
    sqlString(link.destination),
    sqlString(link.createdAt),
    sqlString(link.createdAt),
    "0",
    sqlString("bitly-import"),
    sqlString(link.source),
    String(link.engagements),
  ].join(", ")});`;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
