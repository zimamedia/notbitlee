function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

async function sign(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function signJson(value: unknown, secret: string): Promise<string | null> {
  if (!secret) return null;
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
  const signature = bytesToBase64Url(await sign(secret, payload));
  return `${payload}.${signature}`;
}

export async function readSignedJson(token: string, secret: string): Promise<unknown> {
  if (!secret) return null;
  const separator = token.indexOf(".");
  if (separator <= 0 || token.indexOf(".", separator + 1) !== -1) return null;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const provided = base64UrlToBytes(signature);
  if (!provided) return null;
  const expected = await sign(secret, payload);
  if (!equalBytes(provided, expected)) return null;
  const body = base64UrlToBytes(payload);
  if (!body) return null;
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    return null;
  }
}
