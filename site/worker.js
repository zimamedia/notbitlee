// Sends www.notbitlee.com (and any other non-canonical host) to https://notbitlee.com,
// keeping the path and query string. Everything else is served from ./public.
const CANONICAL_HOST = "notbitlee.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
