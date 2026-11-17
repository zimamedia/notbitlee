import { brandError } from "../shared/brand.ts";
import { destinationError } from "../shared/destination.ts";
import { isEmail, normalizeEmail } from "../shared/identity.ts";
import { importBitlyCsv } from "../shared/import-links.ts";
import { passwordError, verifyPassword } from "../shared/password.ts";
import { shortBase } from "../shared/routing.ts";
import { randomSlug, slugError } from "../shared/slug.ts";
import { beginGoogleLogin, currentUser, finishGoogleLogin, logout, passwordLogin, signInMethods, type SessionUser } from "./auth.ts";
import {
  deleteLink,
  findLink,
  importLinks,
  insertLink,
  libraryCounts,
  libraryStats,
  linkStats,
  listLinks,
  listQuery,
  toLinkJson,
  topLinks,
  updateLink,
} from "./db.ts";
import { isRecord, json, methodNotAllowed, readJson, redirect } from "./http.ts";
import { readBrand, writeSettings } from "./settings.ts";
import { accountFor, addUser, adminEmail, findUser, listTeam, removeUser, setUserPassword, type Role } from "./users.ts";

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!sameOrigin(request, url)) return json({ error: "Cross-site requests are not allowed." }, 403);
  const parts = pathParts(url.pathname);
  if (!parts || parts[0] !== "api") return json({ error: "Not found." }, 404);
  const [, first = "", second, third] = parts;
  const method = request.method;

  // Public
  if (first === "public" && parts.length === 2) return method === "GET" ? publicConfig(request, env) : methodNotAllowed();
  if (first === "auth" && parts.length === 3) {
    if (second === "password") return method === "POST" ? passwordLogin(request, env) : methodNotAllowed();
    if (second === "google") return method === "GET" ? beginGoogleLogin(request, env) : methodNotAllowed();
    if (second === "callback") return method === "GET" ? finishGoogleLogin(request, env) : methodNotAllowed();
    if (second === "logout") return method === "POST" ? logout(request) : methodNotAllowed();
  }

  // Signed in
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Sign in required." }, 401);

  if (first === "me" && parts.length === 2) return method === "GET" ? json(user) : methodNotAllowed();
  if (first === "me" && second === "password" && parts.length === 3) {
    return method === "POST" ? changeOwnPassword(request, env, user) : methodNotAllowed();
  }
  if (first === "links" && parts.length === 2) {
    if (method === "GET") return list(request, env);
    if (method === "POST") return create(request, env, user);
    return methodNotAllowed();
  }
  if (first === "links" && second && parts.length === 3) {
    if (slugError(second) !== null && !(await findLink(env, second))) return json({ error: "No link uses that slug." }, 404);
    if (method === "GET") return detail(env, second);
    if (method === "PATCH") return patch(request, env, second, user);
    if (method === "DELETE") return remove(env, second, user);
    return methodNotAllowed();
  }
  if (first === "stats" && parts.length === 2) return method === "GET" ? stats(env) : methodNotAllowed();
  if (first === "preview-redirect" && second && parts.length === 3) {
    return method === "GET" ? preview(env, second) : methodNotAllowed();
  }
  if (first === "settings" && parts.length === 2) {
    if (method === "GET") return json({ brand: await readBrand(env) });
    if (method === "PUT") return requireOwner(user) ?? saveSettings(request, env);
    return methodNotAllowed();
  }
  if (first === "team" && parts.length === 2) {
    if (method === "GET") return requireOwner(user) ?? json({ team: await listTeam(env) });
    if (method === "POST") return requireOwner(user) ?? addTeammate(request, env);
    return methodNotAllowed();
  }
  if (first === "team" && second && parts.length === 3 && third === undefined) {
    return method === "DELETE" ? (requireOwner(user) ?? removeTeammate(env, second, user)) : methodNotAllowed();
  }
  if (first === "import" && parts.length === 2) return method === "POST" ? importCsv(request, env, user) : methodNotAllowed();

  return json({ error: "Not found." }, 404);
}

async function publicConfig(request: Request, env: Env): Promise<Response> {
  return json({
    brand: await readBrand(env),
    signIn: signInMethods(env),
    shortBase: shortBase(env.SHORT_DOMAIN ?? "", new URL(request.url)),
    timeZone: env.TIMEZONE || "UTC",
  });
}

async function stats(env: Env): Promise<Response> {
  const [counts, clicks, top] = await Promise.all([libraryCounts(env), libraryStats(env), topLinks(env)]);
  return json({ counts, clicks, topLinks: top });
}

async function list(request: Request, env: Env): Promise<Response> {
  const query = listQuery(new URL(request.url));
  return json(await listLinks(env, query.status, query.query, query.limit, query.offset));
}

async function create(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "Send a JSON body." }, 400);

  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  const destinationProblem = destinationError(destination);
  if (destinationProblem) return json({ error: destinationProblem }, 400);

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const requested = typeof body.slug === "string" ? body.slug.trim() : "";
  const slug = requested || (await unusedSlug(env));
  if (!slug) return json({ error: "Could not generate a slug. Try again." }, 500);
  const slugProblem = slugError(slug);
  if (slugProblem) return json({ error: slugProblem }, 400);
  if (await findLink(env, slug)) return json({ error: "That slug is already in use." }, 409);

  try {
    await insertLink(env, { slug, title, destination, createdBy: user.email });
  } catch (error) {
    console.error(JSON.stringify({ message: "create link failed", slug, error: error instanceof Error ? error.message : "unknown" }));
    return json({ error: "That slug is already in use." }, 409);
  }

  const created = await findLink(env, slug);
  if (!created) return json({ error: "The link was not saved." }, 500);
  return json({ link: toLinkJson({ ...created, clicks: 0 }) }, 201);
}

async function detail(env: Env, slug: string): Promise<Response> {
  const link = await findLink(env, slug);
  if (!link) return json({ error: "No link uses that slug." }, 404);
  const stats = await linkStats(env, slug);
  return json({ link: toLinkJson({ ...link, clicks: stats.total }), stats });
}

async function patch(request: Request, env: Env, slug: string, user: SessionUser): Promise<Response> {
  const existing = await findLink(env, slug);
  if (!existing) return json({ error: "No link uses that slug." }, 404);

  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "Send a JSON body." }, 400);

  const changes: { title?: string; destination?: string; archived?: boolean } = {};
  if ("title" in body) {
    if (typeof body.title !== "string") return json({ error: "Title must be text." }, 400);
    changes.title = body.title.trim().slice(0, 200);
  }
  if ("destination" in body) {
    if (typeof body.destination !== "string") return json({ error: "Destination must be a URL." }, 400);
    const destination = body.destination.trim();
    const problem = destinationError(destination);
    if (problem) return json({ error: problem }, 400);
    changes.destination = destination;
  }
  if ("archived" in body) {
    if (typeof body.archived !== "boolean") return json({ error: "Archived must be true or false." }, 400);
    changes.archived = body.archived;
  }
  if (Object.keys(changes).length === 0) return json({ error: "Nothing to update." }, 400);

  await updateLink(env, slug, changes);
  console.log(JSON.stringify({ message: "link updated", slug, by: user.email }));
  return detail(env, slug);
}

async function remove(env: Env, slug: string, user: SessionUser): Promise<Response> {
  if (!(await findLink(env, slug))) return json({ error: "No link uses that slug." }, 404);
  await deleteLink(env, slug);
  console.log(JSON.stringify({ message: "link deleted", slug, by: user.email }));
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

async function preview(env: Env, slug: string): Promise<Response> {
  const link = await findLink(env, slug);
  if (!link) return json({ error: "No link uses that slug." }, 404);
  return redirect(link.destination);
}

async function saveSettings(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "Send a JSON body." }, 400);
  const changes = {
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    color: typeof body.color === "string" ? body.color.trim().toLowerCase() : undefined,
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.trim() : undefined,
    homeUrl: typeof body.homeUrl === "string" ? body.homeUrl.trim() : undefined,
  };
  const problem = brandError(changes);
  if (problem) return json({ error: problem }, 400);

  const values: Record<string, string> = {};
  if (changes.name !== undefined) values.brand_name = changes.name;
  if (changes.color !== undefined) values.brand_color = changes.color;
  if (changes.logoUrl !== undefined) values.brand_logo_url = changes.logoUrl;
  if (changes.homeUrl !== undefined) values.home_url = changes.homeUrl;
  if (typeof body.showPoweredBy === "boolean") values.show_powered_by = body.showPoweredBy ? "1" : "0";
  await writeSettings(env, values);
  return json({ brand: await readBrand(env) });
}

async function addTeammate(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "Send a JSON body." }, 400);
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const name = typeof body.name === "string" ? body.name : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role: Role = body.role === "owner" ? "owner" : "member";
  if (!isEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  if (password) {
    const problem = passwordError(password);
    if (problem) return json({ error: problem }, 400);
  }
  if (await accountFor(env, email)) return json({ error: "That person is already on the team." }, 409);
  await addUser(env, { email, name, password, role });
  return json({ team: await listTeam(env) }, 201);
}

async function removeTeammate(env: Env, email: string, user: SessionUser): Promise<Response> {
  const target = normalizeEmail(email);
  if (target === user.email) return json({ error: "You cannot remove yourself." }, 400);
  if (target === adminEmail(env)) return json({ error: "The admin account comes from ADMIN_EMAIL and cannot be removed here." }, 400);
  await removeUser(env, target);
  return json({ team: await listTeam(env) });
}

async function changeOwnPassword(request: Request, env: Env, user: SessionUser): Promise<Response> {
  if (user.email === adminEmail(env)) {
    return json({ error: "The admin password is the ADMIN_PASSWORD secret. Change it in your Worker settings." }, 400);
  }
  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "Send a JSON body." }, 400);
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  const problem = passwordError(next);
  if (problem) return json({ error: problem }, 400);
  const record = await findUser(env, user.email);
  if (record?.password_hash && !(await verifyPassword(current, record.password_hash))) {
    return json({ error: "Your current password is not right." }, 400);
  }
  await setUserPassword(env, user.email, next);
  return json({ ok: true });
}

async function importCsv(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_IMPORT_BYTES) return json({ error: "That file is over 10 MB. Split it and import each part." }, 413);
  const csv = await request.text();
  if (csv.length > MAX_IMPORT_BYTES) return json({ error: "That file is over 10 MB. Split it and import each part." }, 413);
  let links;
  try {
    links = importBitlyCsv(csv);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "The file could not be read." }, 400);
  }
  if (links.length === 0) return json({ error: "No links were found in that file." }, 400);
  const result = await importLinks(env, links, user.email);
  console.log(JSON.stringify({ message: "import complete", by: user.email, ...result }));
  return json({ ...result, found: links.length });
}

function requireOwner(user: SessionUser): Response | null {
  return user.role === "owner" ? null : json({ error: "Only an owner can do that." }, 403);
}

async function unusedSlug(env: Env): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = randomSlug();
    if (!(await findLink(env, slug))) return slug;
  }
  return null;
}

function sameOrigin(request: Request, url: URL): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  return origin === null || origin === url.origin;
}

function pathParts(pathname: string): string[] | null {
  const parts: string[] = [];
  for (const raw of pathname.split("/")) {
    if (!raw) continue;
    try {
      parts.push(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
  return parts;
}
