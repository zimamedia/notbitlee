import { createRemoteJWKSet, jwtVerify } from "jose";

import { isGoogleConfigured } from "../shared/google-config.ts";
import { googleIdentity, isEmail, normalizeEmail, type IdentityClaims } from "../shared/identity.ts";
import { secretsMatch } from "../shared/password.ts";
import { ADMIN_BASE } from "../shared/routing.ts";
import { readSignedJson, signJson } from "../shared/signed.ts";
import { clearCookie, cookie, isRecord, json, readCookie, readJson } from "./http.ts";
import { sessionSecret } from "./settings.ts";
import { accountFor, adminEmail, checkUserPassword, findUser, passwordLoginConfigured, type Role } from "./users.ts";

const SESSION_COOKIE = "nbl_session";
const STATE_COOKIE = "nbl_oauth";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const STATE_SECONDS = 60 * 10;
const ATTEMPT_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type SessionUser = {
  email: string;
  name: string;
  role: Role;
  simulated: boolean;
  /** The admin from ADMIN_EMAIL, whose password is a Worker secret rather than a database row. */
  fromConfig: boolean;
};

type OauthState = { state: string; nonce: string; exp: number };
type SessionPayload = { email: string; name: string; exp: number };

export function googleConfigured(env: Env): boolean {
  return isGoogleConfigured(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
}

export function signInMethods(env: Env): { password: boolean; google: boolean } {
  return { password: passwordLoginConfigured(env), google: googleConfigured(env) };
}

/** On localhost with no sign-in set up at all, you are signed in as a local owner so you can try the app. */
export function devUser(request: Request, env: Env): SessionUser | null {
  if (passwordLoginConfigured(env) || googleConfigured(env)) return null;
  const url = new URL(request.url);
  if (url.protocol !== "http:") return null;
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
  return { email: "dev@localhost", name: "Local preview", role: "owner", simulated: true, fromConfig: true };
}

export async function currentUser(request: Request, env: Env): Promise<SessionUser | null> {
  const simulated = devUser(request, env);
  if (simulated) return simulated;
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  const payload = await readSignedJson(token, await sessionSecret(env));
  if (!isSessionPayload(payload) || payload.exp * 1000 <= Date.now()) return null;
  const account = await accountFor(env, payload.email);
  if (!account) return null;
  return { email: account.email, name: payload.name, role: account.role, simulated: false, fromConfig: account.email === adminEmail(env) };
}

export async function passwordLogin(request: Request, env: Env): Promise<Response> {
  if (!passwordLoginConfigured(env)) return json({ error: "Password sign-in is not set up yet." }, 400);
  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "Send a JSON body." }, 400);
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!isEmail(email) || !password) return json({ error: "Enter your email and password." }, 400);

  if ((await recentAttempts(env, email)) >= MAX_ATTEMPTS) {
    return json({ error: `Too many attempts. Wait ${ATTEMPT_WINDOW_MINUTES} minutes and try again.` }, 429);
  }

  const isAdmin = email === adminEmail(env) && (await secretsMatch(env.ADMIN_PASSWORD ?? "", password));
  const ok = isAdmin || (await checkUserPassword(env, email, password));
  if (!ok) {
    await env.DB.prepare("INSERT INTO login_attempts (email, attempted_at) VALUES (?, ?)").bind(email, new Date().toISOString()).run();
    console.log(JSON.stringify({ message: "password sign-in rejected" }));
    return json({ error: "That email and password do not match." }, 401);
  }

  await env.DB.prepare("DELETE FROM login_attempts WHERE email = ?").bind(email).run();
  const user = isAdmin ? null : await findUser(env, email);
  const name = user?.name || email.slice(0, email.indexOf("@"));
  const session = await startSession(env, email, name);
  return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, session, request, SESSION_SECONDS) });
}

export async function beginGoogleLogin(request: Request, env: Env): Promise<Response> {
  if (devUser(request, env)) return redirectToApp(request);
  if (!googleConfigured(env)) return redirectToLogin(request, "config");

  const url = new URL(request.url);
  const state = randomToken();
  const nonce = randomToken();
  const signed = await signJson({ state, nonce, exp: Math.floor(Date.now() / 1000) + STATE_SECONDS }, await sessionSecret(env));
  if (!signed) return redirectToLogin(request, "config");

  const auth = new URL(GOOGLE_AUTH);
  auth.searchParams.set("client_id", env.GOOGLE_CLIENT_ID ?? "");
  auth.searchParams.set("redirect_uri", callbackUrl(url));
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  const domain = (env.ALLOWED_EMAIL_DOMAIN ?? "").trim();
  if (domain) auth.searchParams.set("hd", domain);
  auth.searchParams.set("state", state);
  auth.searchParams.set("nonce", nonce);
  auth.searchParams.set("prompt", "select_account");

  return new Response(null, {
    status: 302,
    headers: {
      location: auth.toString(),
      "cache-control": "no-store",
      "set-cookie": cookie(STATE_COOKIE, signed, request, STATE_SECONDS),
    },
  });
}

export async function finishGoogleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return redirectToLogin(request, "oauth");
  if (!googleConfigured(env)) return redirectToLogin(request, "config");

  const secret = await sessionSecret(env);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const stateToken = readCookie(request.headers.get("cookie"), STATE_COOKIE);
  const stored = stateToken ? await readSignedJson(stateToken, secret) : null;
  const clearState = [clearCookie(STATE_COOKIE, request)];
  if (!code || !isOauthState(stored) || stored.state !== state || stored.exp * 1000 <= Date.now()) {
    return redirectToLogin(request, "oauth", clearState);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: callbackUrl(url),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    console.error(JSON.stringify({ message: "google token exchange failed", status: tokenResponse.status }));
    return redirectToLogin(request, "oauth", clearState);
  }

  const tokenBody = (await tokenResponse.json()) as { id_token?: unknown };
  if (typeof tokenBody.id_token !== "string") return redirectToLogin(request, "oauth", clearState);

  const claims = await verifyGoogleIdToken(tokenBody.id_token, env.GOOGLE_CLIENT_ID ?? "", stored.nonce);
  if (!claims) return redirectToLogin(request, "oauth", clearState);

  const claimedEmail = typeof claims.email === "string" ? normalizeEmail(claims.email) : "";
  const known = claimedEmail !== "" && (await accountFor(env, claimedEmail)) !== null;
  const identity = googleIdentity(claims, { allowedDomain: env.ALLOWED_EMAIL_DOMAIN ?? "", isKnownEmail: () => known });
  if (!identity.ok) {
    console.log(JSON.stringify({ message: "google sign-in rejected", reason: identity.reason }));
    return redirectToLogin(request, "not-allowed", clearState);
  }

  // People let in by domain become members the first time they sign in.
  if (!known) {
    await env.DB.prepare("INSERT OR IGNORE INTO users (email, name, password_hash, role, created_at) VALUES (?, ?, NULL, 'member', ?)")
      .bind(identity.email, identity.name, new Date().toISOString())
      .run();
  }

  const session = await startSession(env, identity.email, identity.name);
  return redirectToApp(request, [cookie(SESSION_COOKIE, session, request, SESSION_SECONDS), ...clearState]);
}

export function logout(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store", "set-cookie": clearCookie(SESSION_COOKIE, request) },
  });
}

async function startSession(env: Env, email: string, name: string): Promise<string> {
  const token = await signJson({ email, name, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }, await sessionSecret(env));
  if (!token) throw new Error("Could not sign the session.");
  return token;
}

async function recentAttempts(env: Env, email: string): Promise<number> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString();
  await env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").bind(since).run();
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM login_attempts WHERE email = ? AND attempted_at >= ?")
    .bind(email, since)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

async function verifyGoogleIdToken(idToken: string, audience: string, nonce: string): Promise<IdentityClaims | null> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    });
    if (payload.nonce !== nonce) return null;
    return { email: payload.email, email_verified: payload.email_verified, hd: payload.hd, name: payload.name };
  } catch (error) {
    console.error(JSON.stringify({ message: "google id token rejected", error: error instanceof Error ? error.message : "unknown" }));
    return null;
  }
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Partial<SessionPayload>;
  return typeof payload.email === "string" && typeof payload.name === "string" && typeof payload.exp === "number";
}

function isOauthState(value: unknown): value is OauthState {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Partial<OauthState>;
  return typeof payload.state === "string" && typeof payload.nonce === "string" && typeof payload.exp === "number";
}

function callbackUrl(url: URL): string {
  return new URL("/api/auth/callback", url.origin).toString();
}

function redirectToApp(request: Request, cookies: string[] = []): Response {
  const headers = new Headers({ location: new URL(ADMIN_BASE, request.url).toString(), "cache-control": "no-store" });
  for (const item of cookies) headers.append("set-cookie", item);
  return new Response(null, { status: 302, headers });
}

function redirectToLogin(request: Request, error: "config" | "oauth" | "not-allowed", cookies: string[] = []): Response {
  const location = new URL(`${ADMIN_BASE}/login`, request.url);
  location.searchParams.set("error", error);
  const headers = new Headers({ location: location.toString(), "cache-control": "no-store" });
  for (const item of cookies) headers.append("set-cookie", item);
  return new Response(null, { status: 302, headers });
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
