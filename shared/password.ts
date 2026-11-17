// PBKDF2-SHA256 through Web Crypto. Workers cap PBKDF2 at 100,000 iterations.
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export const MIN_PASSWORD_LENGTH = 10;

export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 200) return "That password is too long.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsRaw, saltHex, hashHex] = stored.split("$");
  const iterations = Number(iterationsRaw);
  if (scheme !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 1 || !saltHex || !hashHex) return false;
  const salt = fromHex(saltHex);
  const expected = fromHex(hashHex);
  if (!salt || !expected) return false;
  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

/** Compares two strings without leaking where they differ. */
export async function secretsMatch(expected: string, provided: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
  ]);
  return timingSafeEqual(new Uint8Array(left), new Uint8Array(right)) && expected.length === provided.length;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, KEY_BITS);
  return new Uint8Array(bits);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}
