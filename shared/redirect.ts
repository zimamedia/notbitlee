import { isReservedSlug, isSlug } from "./slug.ts";

export type ShortPath =
  | { kind: "home" }
  | { kind: "slug"; slug: string }
  | { kind: "invalid" };

export type RedirectResult = { status: 302; location: string } | { status: 404 };

export function classifyShortPath(pathname: string): ShortPath {
  let path = pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "" || path === "/") return { kind: "home" };

  const raw = path.startsWith("/") ? path.slice(1) : path;
  if (raw.includes("/")) return { kind: "invalid" };

  let slug: string;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    return { kind: "invalid" };
  }

  if (!isSlug(slug) || isReservedSlug(slug)) return { kind: "invalid" };
  return { kind: "slug", slug };
}

/** `home` is where the bare short domain sends people. When it is empty, they go to the dashboard. */
export function redirectFor(path: ShortPath, destination: string | null, home: string): RedirectResult {
  switch (path.kind) {
    case "home":
      return { status: 302, location: home || "/admin" };
    case "invalid":
      return { status: 404 };
    case "slug":
      if (!destination) return { status: 404 };
      return { status: 302, location: destination };
    default: {
      const exhaustive: never = path;
      return exhaustive;
    }
  }
}
