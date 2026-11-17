import { ADMIN_BASE, routeRequest } from "../shared/routing.ts";
import { handleApi } from "./api.ts";
import { handleRedirect } from "./redirects.ts";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    try {
      // Vite's dev server serves source modules from paths like /src/main.tsx and /@vite/client.
      // They only exist in development; in production, built files live under /assets.
      if (import.meta.env.DEV && isDevServerPath(url.pathname)) return await env.ASSETS.fetch(request);
      const route = routeRequest(url.hostname, url.pathname, { dashboardDomain: env.DASHBOARD_DOMAIN ?? "" });
      switch (route.kind) {
        case "api":
          return await handleApi(request, env);
        case "app":
        case "asset":
          return await env.ASSETS.fetch(request);
        case "to-admin":
          return Response.redirect(new URL(ADMIN_BASE, url).toString(), 302);
        case "short":
          return await handleRedirect(request, env, ctx);
        default: {
          const exhaustive: never = route;
          return exhaustive;
        }
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "request failed",
          path: url.pathname,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
      return new Response("Something went wrong", { status: 500, headers: { "cache-control": "no-store" } });
    }
  },
} satisfies ExportedHandler<Env>;

function isDevServerPath(pathname: string): boolean {
  return ["/@", "/src/", "/node_modules/", "/shared/", "/__"].some((prefix) => pathname.startsWith(prefix));
}
