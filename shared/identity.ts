export type IdentityClaims = {
  email?: unknown;
  email_verified?: unknown;
  hd?: unknown;
  name?: unknown;
};

export type GooglePolicy = {
  /** Anyone with a verified Workspace account on this domain may sign in. Empty means nobody by domain. */
  allowedDomain: string;
  /** Specific emails that may sign in with Google (the admin and invited teammates). */
  isKnownEmail: (email: string) => boolean;
};

export type Identity =
  | { ok: true; email: string; name: string }
  | { ok: false; reason: "missing" | "unverified" | "not-allowed" };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function googleIdentity(claims: IdentityClaims, policy: GooglePolicy): Identity {
  const email = typeof claims.email === "string" ? normalizeEmail(claims.email) : "";
  const hostedDomain = typeof claims.hd === "string" ? claims.hd.trim().toLowerCase() : "";
  const verified = claims.email_verified === true || claims.email_verified === "true";

  if (!isEmail(email)) return { ok: false, reason: "missing" };
  if (!verified) return { ok: false, reason: "unverified" };

  const domain = policy.allowedDomain.trim().toLowerCase();
  const local = email.slice(0, email.lastIndexOf("@"));
  const byDomain = domain !== "" && email.endsWith(`@${domain}`) && hostedDomain === domain;
  if (!byDomain && !policy.isKnownEmail(email)) return { ok: false, reason: "not-allowed" };

  const rawName = typeof claims.name === "string" ? claims.name.trim() : "";
  return { ok: true, email, name: (rawName || local).slice(0, 80) };
}
