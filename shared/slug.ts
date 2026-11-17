const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Paths the app itself uses. A short link can never take one of these.
export const RESERVED_SLUGS = new Set(["admin", "api", "assets", "favicon.svg", "robots.txt"]);

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.has(value.toLowerCase());
}

export function slugError(value: string): string | null {
  if (!isSlug(value)) return "Use 1–64 letters, numbers, hyphens, or underscores.";
  if (isReservedSlug(value)) return "That slug is reserved by the app. Pick another.";
  return null;
}

export function randomSlug(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (const byte of bytes) {
    slug += ALPHABET[byte % ALPHABET.length];
  }
  return slug;
}

export function shortUrl(base: string, slug: string): string {
  return `${base.replace(/\/+$/, "")}/${slug}`;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
