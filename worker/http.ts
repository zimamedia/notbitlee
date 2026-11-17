import type { Brand } from "../shared/brand.ts";
import { displayUrl } from "../shared/slug.ts";

export function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers(extra);
  headers.set("cache-control", "no-store");
  return Response.json(body, { status, headers });
}

export function redirect(location: string, status: 302 | 303 = 302, cookies: string[] = []): Response {
  const headers = new Headers({
    location,
    "cache-control": "no-store",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status, headers });
}

export function methodNotAllowed(): Response {
  return json({ error: "Method not allowed." }, 405);
}

export function notFoundPage(brand: Brand): Response {
  const name = escapeHtml(brand.name);
  const home = brand.homeUrl ? `<p><a href="${escapeHtml(brand.homeUrl)}">Go to ${escapeHtml(displayUrl(brand.homeUrl))}</a></p>` : "";
  const logo = brand.logoUrl ? `<img src="${escapeHtml(brand.logoUrl)}" alt="" height="32">` : `<p class="name">${name}</p>`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Link not found · ${name}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f6f7f9; color: #111827; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    main { max-width: 28rem; padding: 2.5rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; margin: 1rem; }
    .name { font-weight: 700; color: ${brand.color}; margin: 0; }
    h1 { font-size: 1.5rem; margin: 1.25rem 0 0.5rem; }
    p { color: #4b5563; line-height: 1.5; }
    a { color: ${brand.color}; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    ${logo}
    <h1>This short link does not exist.</h1>
    <p>Check the address for typos. The link may also have been removed.</p>
    ${home}
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

export function cookie(name: string, value: string, request: Request, maxAge: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCookie(name: string, request: Request): string {
  return cookie(name, "", request, 0);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
