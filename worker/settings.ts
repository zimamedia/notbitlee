import { normalizeBrand, type Brand } from "../shared/brand.ts";

const GENERATED_SECRET_KEY = "session_secret";

export async function readSettings(env: Env): Promise<Record<string, string>> {
  const result = await env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  return Object.fromEntries(result.results.map((row) => [row.key, row.value]));
}

export async function writeSettings(env: Env, values: Record<string, string>): Promise<void> {
  const entries = Object.entries(values);
  if (entries.length === 0) return;
  await env.DB.batch(
    entries.map(([key, value]) =>
      env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(
        key,
        value,
      ),
    ),
  );
}

export async function readBrand(env: Env): Promise<Brand> {
  return normalizeBrand(await readSettings(env), env.BRAND_NAME ?? "");
}

/**
 * The key that signs session cookies. A SESSION_SECRET secret wins; otherwise a random key is made
 * once and kept in the database, so a one-click deploy needs no extra secret.
 */
export async function sessionSecret(env: Env): Promise<string> {
  const configured = (env.SESSION_SECRET ?? "").trim();
  if (configured.length >= 16) return configured;

  const existing = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(GENERATED_SECRET_KEY).first<{ value: string }>();
  if (existing?.value) return existing.value;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const generated = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  // If two requests race, the first write wins and both read it back.
  await env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(GENERATED_SECRET_KEY, generated).run();
  const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(GENERATED_SECRET_KEY).first<{ value: string }>();
  return stored?.value ?? generated;
}
