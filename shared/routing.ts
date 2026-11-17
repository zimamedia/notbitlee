export type HostConfig = {
  /** Optional separate dashboard host, e.g. links.example.com. */
  dashboardDomain: string;
};

export type RouteKind =
  | { kind: "api" }
  | { kind: "app" }
  | { kind: "asset" }
  | { kind: "to-admin" }
  | { kind: "short" };

export const ADMIN_BASE = "/admin";

/**
 * Decides who handles a request.
 * - /api/* is the JSON API on every host.
 * - /admin and /admin/* is the dashboard on every host.
 * - Built files (/assets/*, /favicon.svg) are served as-is.
 * - On a separate dashboard domain, everything else goes to /admin.
 * - Everywhere else, the path is a short link.
 */
export function routeRequest(hostname: string, pathname: string, config: HostConfig): RouteKind {
  if (pathname === "/api" || pathname.startsWith("/api/")) return { kind: "api" };
  if (pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`)) return { kind: "app" };
  if (pathname.startsWith("/assets/") || pathname === "/favicon.svg") return { kind: "asset" };
  const dashboard = normalizeHost(config.dashboardDomain);
  if (dashboard && normalizeHost(hostname) === dashboard) return { kind: "to-admin" };
  return { kind: "short" };
}

export function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

/** The base URL short links are shown with, e.g. https://go.example.com. */
export function shortBase(shortDomain: string, requestUrl: URL): string {
  const host = normalizeHost(shortDomain);
  if (host) return `https://${host}`;
  return requestUrl.origin;
}
