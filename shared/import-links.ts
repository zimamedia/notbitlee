import { parseCsv } from "./csv.ts";
import { destinationError } from "./destination.ts";
import { isReservedSlug, isSlug } from "./slug.ts";

/** The host the link lived on before, e.g. "bit.ly" or your old custom domain. */
export type ImportSource = string;

export type ImportedLink = {
  slug: string;
  title: string;
  destination: string;
  createdAt: string;
  engagements: number;
  source: ImportSource;
};

const TITLE_LIMIT = 200;

export function importBitlyCsv(csv: string): ImportedLink[] {
  const table = parseCsv(csv);
  const header = table[0];
  if (!header) throw new Error("The CSV file is empty.");

  const columns = new Map(header.map((name, index) => [name.trim(), index]));
  const linkIndex = requiredColumn(columns, "Link");
  const dateIndex = requiredColumn(columns, "Date Created");
  const titleIndex = requiredColumn(columns, "Title");
  const destinationIndex = requiredColumn(columns, "Destination URL");
  const engagementIndex = engagementColumn(columns);

  const chosen = new Map<string, ImportedLink>();
  const order: string[] = [];

  for (const record of table.slice(1)) {
    const parsed = parseRecord(record, {
      linkIndex,
      dateIndex,
      titleIndex,
      destinationIndex,
      engagementIndex,
    });
    if (!parsed) continue;

    const existing = chosen.get(parsed.slug);
    if (!existing) {
      chosen.set(parsed.slug, parsed);
      order.push(parsed.slug);
      continue;
    }
    if (parsed.createdAt > existing.createdAt) chosen.set(parsed.slug, parsed);
  }

  return order.map((slug) => {
    const link = chosen.get(slug);
    if (!link) throw new Error(`Missing imported slug ${slug}`);
    return link;
  });
}

type ColumnIndexes = {
  linkIndex: number;
  dateIndex: number;
  titleIndex: number;
  destinationIndex: number;
  engagementIndex: number;
};

function parseRecord(record: string[], columns: ColumnIndexes): ImportedLink | null {
  const source = importSource(record[columns.linkIndex] ?? "");
  if (!source) return null;

  const slug = slugFromLink(record[columns.linkIndex] ?? "");
  if (!slug || !isSlug(slug) || isReservedSlug(slug)) return null;

  const destination = (record[columns.destinationIndex] ?? "").trim();
  if (destinationError(destination)) return null;

  const createdAt = createdAtFromUsDate(record[columns.dateIndex] ?? "");
  if (!createdAt) return null;

  const title = (record[columns.titleIndex] ?? "").trim().slice(0, TITLE_LIMIT);
  const engagements = columns.engagementIndex < 0 ? 0 : parseEngagements(record[columns.engagementIndex] ?? "");

  return { slug, title, destination, createdAt, engagements, source };
}

function importSource(link: string): ImportSource | null {
  try {
    const host = new URL(link.trim()).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function slugFromLink(link: string): string | null {
  try {
    const path = new URL(link.trim()).pathname.replace(/\/+$/, "");
    const slug = decodeURIComponent(path.startsWith("/") ? path.slice(1) : path);
    if (!slug || slug.includes("/")) return null;
    return slug;
  } catch {
    return null;
  }
}

function createdAtFromUsDate(value: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value.trim()) ? new Date(value.trim()) : null;
  if (iso && !Number.isNaN(iso.getTime())) return iso.toISOString();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString();
}

function parseEngagements(value: string): number {
  const parsed = Number(value.trim() || "0");
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function requiredColumn(columns: Map<string, number>, name: string): number {
  const index = columns.get(name);
  if (index === undefined) throw new Error(`This does not look like a Bitly export: the "${name}" column is missing.`);
  return index;
}

function engagementColumn(columns: Map<string, number>): number {
  for (const [name, index] of columns) {
    if (name.startsWith("Engagements")) return index;
  }
  return -1;
}
