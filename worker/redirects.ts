import { classifyShortPath, redirectFor } from "../shared/redirect.ts";
import { findLink, recordClick } from "./db.ts";
import { notFoundPage } from "./http.ts";
import { readBrand } from "./settings.ts";

export async function handleRedirect(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
  }

  const url = new URL(request.url);
  const path = classifyShortPath(url.pathname);
  const destination = path.kind === "slug" ? ((await findLink(env, path.slug))?.destination ?? null) : null;
  const home = path.kind === "home" ? (await readBrand(env)).homeUrl : "";
  const decision = redirectFor(path, destination, home);

  if (decision.status === 404) return notFoundPage(await readBrand(env));

  if (request.method === "GET" && path.kind === "slug") {
    ctx.waitUntil(recordClick(env, path.slug, request));
  }

  return new Response(null, {
    status: 302,
    headers: { location: decision.location, "cache-control": "no-store" },
  });
}
