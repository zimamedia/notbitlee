import { parseArchiveFilter, type ArchiveFilter } from "../shared/archive.ts";
import { safeTimeZone, summarizeClicks, type ClickEvent, type ClickStats } from "../shared/click-history.ts";
import type { ImportedLink } from "../shared/import-links.ts";

export type LinkRow = {
  slug: string;
  title: string;
  destination: string;
  created_at: string;
  updated_at: string;
  archived: number;
  created_by: string | null;
  imported_from: string | null;
  bitly_engagements: number | null;
  clicks?: number;
};

export type LinkJson = {
  slug: string;
  title: string;
  destination: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  createdBy: string | null;
  importedFrom: string | null;
  bitlyEngagements: number | null;
  clicks: number;
};

type SqlValue = string | number | null;

export function toLinkJson(row: LinkRow): LinkJson {
  return {
    slug: row.slug,
    title: row.title,
    destination: row.destination,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived !== 0,
    createdBy: row.created_by,
    importedFrom: row.imported_from,
    bitlyEngagements: row.bitly_engagements,
    clicks: row.clicks ?? 0,
  };
}

export async function findLink(env: Env, slug: string): Promise<LinkRow | null> {
  return env.DB.prepare(
    `SELECT slug, title, destination, created_at, updated_at, archived, created_by, imported_from, bitly_engagements
     FROM links WHERE slug = ?`,
  )
    .bind(slug)
    .first<LinkRow>();
}

export async function listLinks(
  env: Env,
  status: ArchiveFilter,
  query: string,
  limit: number,
  offset: number,
): Promise<{ links: LinkJson[]; total: number }> {
  const filter = linkFilter(status, query);
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM links l ${filter.clause}`)
    .bind(...filter.params)
    .first<{ total: number }>();
  const result = await env.DB.prepare(
    `SELECT l.slug, l.title, l.destination, l.created_at, l.updated_at, l.archived, l.created_by,
            l.imported_from, l.bitly_engagements, COUNT(c.id) AS clicks
     FROM links l
     LEFT JOIN clicks c ON c.slug = l.slug
     ${filter.clause}
     GROUP BY l.slug
     ORDER BY l.created_at DESC, l.slug ASC
     LIMIT ? OFFSET ?`,
  )
    .bind(...filter.params, limit, offset)
    .all<LinkRow>();

  return {
    total: totalRow?.total ?? 0,
    links: result.results.map((row) => toLinkJson(row)),
  };
}

export async function insertLink(
  env: Env,
  link: { slug: string; title: string; destination: string; createdBy: string },
): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO links (slug, title, destination, created_at, updated_at, archived, created_by, imported_from, bitly_engagements)
     VALUES (?, ?, ?, ?, ?, 0, ?, NULL, NULL)`,
  )
    .bind(link.slug, link.title, link.destination, now, now, link.createdBy)
    .run();
}

export async function updateLink(
  env: Env,
  slug: string,
  patch: { title?: string; destination?: string; archived?: boolean },
): Promise<void> {
  const assignments: string[] = ["updated_at = ?"];
  const params: SqlValue[] = [new Date().toISOString()];
  if (patch.title !== undefined) {
    assignments.push("title = ?");
    params.push(patch.title);
  }
  if (patch.destination !== undefined) {
    assignments.push("destination = ?");
    params.push(patch.destination);
  }
  if (patch.archived !== undefined) {
    assignments.push("archived = ?");
    params.push(patch.archived ? 1 : 0);
  }
  params.push(slug);
  await env.DB.prepare(`UPDATE links SET ${assignments.join(", ")} WHERE slug = ?`)
    .bind(...params)
    .run();
}

export async function linkStats(env: Env, slug: string): Promise<ClickStats> {
  return clickStats(env, "WHERE slug = ?", [slug]);
}

export async function libraryStats(env: Env): Promise<ClickStats> {
  return clickStats(env, "", []);
}

async function clickStats(env: Env, where: string, params: SqlValue[]): Promise<ClickStats> {
  // Clicks are grouped by hour in SQL so a busy link does not load every row. The half-past mark keeps
  // each hour on the right local day for whole- and half-hour time zones.
  const result = await env.DB.prepare(
    `SELECT substr(clicked_at, 1, 13) || ':30:00.000Z' AS at, country, referrer, COUNT(*) AS count
     FROM clicks ${where}
     GROUP BY substr(clicked_at, 1, 13), country, referrer
     ORDER BY at ASC`,
  )
    .bind(...params)
    .all<ClickEvent>();
  return summarizeClicks(result.results, new Date(), safeTimeZone(env.TIMEZONE));
}

export async function topLinks(env: Env, limit = 10): Promise<LinkJson[]> {
  const result = await env.DB.prepare(
    `SELECT l.slug, l.title, l.destination, l.created_at, l.updated_at, l.archived, l.created_by,
            l.imported_from, l.bitly_engagements, COUNT(c.id) AS clicks
     FROM links l
     JOIN clicks c ON c.slug = l.slug
     GROUP BY l.slug
     ORDER BY clicks DESC, l.slug ASC
     LIMIT ?`,
  )
    .bind(limit)
    .all<LinkRow>();
  return result.results.map((row) => toLinkJson(row));
}

export async function libraryCounts(env: Env): Promise<{ links: number; active: number; clicks: number; last7Days: number }> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [links, clicks] = await env.DB.batch<{ total: number; active?: number; recent?: number }>([
    env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END) AS active FROM links"),
    env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN clicked_at >= ? THEN 1 ELSE 0 END) AS recent FROM clicks").bind(since),
  ]);
  const linkRow = links?.results[0];
  const clickRow = clicks?.results[0];
  return {
    links: linkRow?.total ?? 0,
    active: linkRow?.active ?? 0,
    clicks: clickRow?.total ?? 0,
    last7Days: clickRow?.recent ?? 0,
  };
}

/** Adds imported links. Slugs that already exist are left alone, so running an import twice is safe. */
export async function importLinks(env: Env, links: ImportedLink[], importedBy: string): Promise<{ added: number; skipped: number }> {
  const before = await env.DB.prepare("SELECT COUNT(*) AS total FROM links").first<{ total: number }>();
  for (let index = 0; index < links.length; index += 50) {
    const slice = links.slice(index, index + 50);
    await env.DB.batch(
      slice.map((link) =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO links (slug, title, destination, created_at, updated_at, archived, created_by, imported_from, bitly_engagements)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        ).bind(link.slug, link.title, link.destination, link.createdAt, link.createdAt, importedBy, link.source, link.engagements),
      ),
    );
  }
  const after = await env.DB.prepare("SELECT COUNT(*) AS total FROM links").first<{ total: number }>();
  const added = (after?.total ?? 0) - (before?.total ?? 0);
  return { added, skipped: links.length - added };
}

export async function deleteLink(env: Env, slug: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM clicks WHERE slug = ?").bind(slug),
    env.DB.prepare("DELETE FROM links WHERE slug = ?").bind(slug),
  ]);
}

export async function recordClick(env: Env, slug: string, request: Request): Promise<void> {
  try {
    const country = countryFromRequest(request);
    const referrer = referrerHost(request.headers.get("referer"));
    await env.DB.prepare("INSERT INTO clicks (slug, clicked_at, country, referrer) VALUES (?, ?, ?, ?)")
      .bind(slug, new Date().toISOString(), country, referrer)
      .run();
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "click log failed",
        slug,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
}

export function listQuery(url: URL): { status: ArchiveFilter; query: string; limit: number; offset: number } {
  const limitRaw = Number(url.searchParams.get("limit") ?? "40");
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 40;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  return {
    status: parseArchiveFilter(url.searchParams.get("status")),
    query: (url.searchParams.get("q") ?? "").trim().slice(0, 200),
    limit,
    offset,
  };
}

function linkFilter(status: ArchiveFilter, query: string): { clause: string; params: SqlValue[] } {
  const clauses: string[] = [];
  const params: SqlValue[] = [];
  switch (status) {
    case "active":
      clauses.push("l.archived = 0");
      break;
    case "archived":
      clauses.push("l.archived = 1");
      break;
    case "all":
      break;
    default: {
      const exhaustive: never = status;
      throw new Error(exhaustive);
    }
  }
  if (query) {
    const pattern = `%${query.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    clauses.push(
      "(l.slug LIKE ? ESCAPE '\\' OR l.title LIKE ? ESCAPE '\\' OR l.destination LIKE ? ESCAPE '\\')",
    );
    params.push(pattern, pattern, pattern);
  }
  return { clause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function countryFromRequest(request: Request): string | null {
  const country = request.cf && typeof request.cf.country === "string" ? request.cf.country : "";
  if (!/^[A-Za-z]{2}$/.test(country)) return null;
  return country.toUpperCase();
}

function referrerHost(value: string | null): string | null {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (!host || host.length > 200) return null;
    return host;
  } catch {
    return null;
  }
}
