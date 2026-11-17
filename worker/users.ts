import { isEmail, normalizeEmail } from "../shared/identity.ts";
import { hashPassword, verifyPassword } from "../shared/password.ts";

export type Role = "owner" | "member";

export type TeamMember = {
  email: string;
  name: string;
  role: Role;
  hasPassword: boolean;
  createdAt: string | null;
  fromConfig: boolean;
};

type UserRow = {
  email: string;
  name: string;
  password_hash: string | null;
  role: Role;
  created_at: string;
};

export function adminEmail(env: Env): string {
  const email = normalizeEmail(env.ADMIN_EMAIL ?? "");
  return isEmail(email) ? email : "";
}

export function passwordLoginConfigured(env: Env): boolean {
  return adminEmail(env) !== "" && (env.ADMIN_PASSWORD ?? "").length > 0;
}

export async function findUser(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT email, name, password_hash, role, created_at FROM users WHERE email = ?")
    .bind(normalizeEmail(email))
    .first<UserRow>();
}

/** Who this email is now, or null if they may no longer sign in. Checked on every request, so removing someone takes effect at once. */
export async function accountFor(env: Env, email: string): Promise<{ email: string; role: Role } | null> {
  const normalized = normalizeEmail(email);
  if (normalized && normalized === adminEmail(env)) return { email: normalized, role: "owner" };
  const user = await findUser(env, normalized);
  if (user) return { email: user.email, role: user.role };
  return null;
}

export async function listTeam(env: Env): Promise<TeamMember[]> {
  const rows = await env.DB.prepare("SELECT email, name, password_hash, role, created_at FROM users ORDER BY created_at ASC").all<UserRow>();
  const members: TeamMember[] = rows.results.map((row) => ({
    email: row.email,
    name: row.name,
    role: row.role,
    hasPassword: row.password_hash !== null,
    createdAt: row.created_at,
    fromConfig: false,
  }));
  const admin = adminEmail(env);
  if (admin && !members.some((member) => member.email === admin)) {
    members.unshift({ email: admin, name: "", role: "owner", hasPassword: true, createdAt: null, fromConfig: true });
  }
  return members;
}

export async function addUser(env: Env, user: { email: string; name: string; password: string; role: Role }): Promise<void> {
  const hash = user.password ? await hashPassword(user.password) : null;
  await env.DB.prepare("INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(normalizeEmail(user.email), user.name.trim().slice(0, 80), hash, user.role, new Date().toISOString())
    .run();
}

export async function removeUser(env: Env, email: string): Promise<void> {
  await env.DB.prepare("DELETE FROM users WHERE email = ?").bind(normalizeEmail(email)).run();
}

export async function setUserPassword(env: Env, email: string, password: string): Promise<void> {
  await env.DB.prepare("UPDATE users SET password_hash = ? WHERE email = ?").bind(await hashPassword(password), normalizeEmail(email)).run();
}

export async function checkUserPassword(env: Env, email: string, password: string): Promise<boolean> {
  const user = await findUser(env, email);
  if (!user?.password_hash) return false;
  return verifyPassword(password, user.password_hash);
}
