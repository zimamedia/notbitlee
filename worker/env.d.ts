// Secrets are not in wrangler.jsonc, so `wrangler types` cannot see them. They are all optional:
// the login page explains what is missing.
interface Env {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}
