import { describe, expect, it } from "vitest";

import { brandError, normalizeBrand } from "../shared/brand.ts";
import { localDay, summarizeClicks } from "../shared/click-history.ts";
import { destinationError } from "../shared/destination.ts";
import { isGoogleConfigured } from "../shared/google-config.ts";
import { googleIdentity } from "../shared/identity.ts";
import { importBitlyCsv } from "../shared/import-links.ts";
import { hashPassword, passwordError, secretsMatch, verifyPassword } from "../shared/password.ts";
import { classifyShortPath, redirectFor } from "../shared/redirect.ts";
import { routeRequest, shortBase } from "../shared/routing.ts";
import { readSignedJson, signJson } from "../shared/signed.ts";
import { shortUrl, slugError } from "../shared/slug.ts";

const header =
  "Link,Date Created,Title,Destination URL,Expiration Date,Dynamic Routing Destinations,Engagements Max History (10/14/2026 - 11/12/2026),Status";

describe("importBitlyCsv", () => {
  it("keeps the newest destination and the first row when dates tie", () => {
    const csv = [
      header,
      "https://go.example.com/abc,01/02/2024,Old,https://example.com/old,,,1,Active",
      "https://go.example.com/abc,03/04/2024,New,https://example.com/new,,,9,Active",
      "https://go.example.com/same,05/06/2024,First,https://example.com/first,,,0,Active",
      "https://go.example.com/same,05/06/2024,Second,https://example.com/second,,,4,Active",
      "https://bit.ly/freeSlug,01/01/2026,Bit,https://example.com/bit,,,2,Active",
      'https://go.example.com/quoted,04/19/2022,Quoted,"https://example.com/?a=Monthly (No discount)&b=1,2",,,0,Active',
    ].join("\n");

    const links = importBitlyCsv(csv);
    expect(links.find((link) => link.slug === "abc")).toMatchObject({
      destination: "https://example.com/new",
      engagements: 9,
      source: "go.example.com",
    });
    expect(links.find((link) => link.slug === "same")?.destination).toBe("https://example.com/first");
    expect(links.find((link) => link.slug === "freeSlug")).toMatchObject({ source: "bit.ly", engagements: 2 });
    expect(links.find((link) => link.slug === "quoted")?.destination).toContain("1,2");
  });

  it("skips unsafe destinations and slugs the app reserves", () => {
    const csv = [
      header,
      "https://bit.ly/admin,01/02/2024,Reserved,https://example.com/a,,,1,Active",
      "https://bit.ly/bad,01/02/2024,Bad,javascript:alert(1),,,1,Active",
      "https://bit.ly/good,01/02/2024,Good,https://example.com/good,,,1,Active",
    ].join("\n");
    expect(importBitlyCsv(csv).map((link) => link.slug)).toEqual(["good"]);
  });

  it("explains when a file is not a Bitly export", () => {
    expect(() => importBitlyCsv("name,url\nx,https://example.com")).toThrow(/Bitly export/);
  });
});

describe("routing", () => {
  const single = { dashboardDomain: "" };
  const split = { dashboardDomain: "links.example.com" };

  it("keeps the API and dashboard on every host and treats the rest as short links", () => {
    expect(routeRequest("go.example.com", "/api/me", single)).toEqual({ kind: "api" });
    expect(routeRequest("go.example.com", "/admin", single)).toEqual({ kind: "app" });
    expect(routeRequest("go.example.com", "/admin/links/abc", single)).toEqual({ kind: "app" });
    expect(routeRequest("go.example.com", "/assets/index.js", single)).toEqual({ kind: "asset" });
    expect(routeRequest("go.example.com", "/abc", single)).toEqual({ kind: "short" });
    expect(routeRequest("go.example.com", "/administrator", single)).toEqual({ kind: "short" });
  });

  it("sends a separate dashboard domain to /admin", () => {
    expect(routeRequest("links.example.com", "/", split)).toEqual({ kind: "to-admin" });
    expect(routeRequest("LINKS.example.com", "/abc", split)).toEqual({ kind: "to-admin" });
    expect(routeRequest("go.example.com", "/abc", split)).toEqual({ kind: "short" });
  });

  it("shows short links on the configured domain or the current one", () => {
    expect(shortBase("go.example.com", new URL("https://x.workers.dev/admin"))).toBe("https://go.example.com");
    expect(shortBase("https://go.example.com/", new URL("https://x.workers.dev/admin"))).toBe("https://go.example.com");
    expect(shortBase("", new URL("https://x.workers.dev/admin"))).toBe("https://x.workers.dev");
    expect(shortUrl("https://go.example.com", "abc")).toBe("https://go.example.com/abc");
  });
});

describe("redirect lookup", () => {
  it("sends the bare domain home, or to the dashboard when no home page is set", () => {
    expect(redirectFor(classifyShortPath("/"), null, "https://example.com")).toEqual({ status: 302, location: "https://example.com" });
    expect(redirectFor(classifyShortPath("/"), null, "")).toEqual({ status: 302, location: "/admin" });
  });

  it("sends known slugs to their destination and everything else to 404", () => {
    expect(redirectFor(classifyShortPath("/login/"), "https://example.com/login", "")).toEqual({
      status: 302,
      location: "https://example.com/login",
    });
    expect(redirectFor(classifyShortPath("/missing"), null, "")).toEqual({ status: 404 });
    expect(redirectFor(classifyShortPath("/a/b"), "https://example.com", "")).toEqual({ status: 404 });
    expect(redirectFor(classifyShortPath("/javascript:alert(1)"), null, "").status).toBe(404);
    expect(classifyShortPath("/admin")).toEqual({ kind: "invalid" });
  });

  it("does not accept unsafe destinations or reserved slugs", () => {
    expect(destinationError("javascript:alert(1)")).toBeTruthy();
    expect(destinationError("https://example.com/\nSet-Cookie: x")).toBeTruthy();
    expect(slugError("admin")).toMatch(/reserved/);
    expect(slugError("API")).toMatch(/reserved/);
    expect(slugError("summer-sale")).toBeNull();
  });
});

describe("click history", () => {
  it("groups clicks by day in the configured time zone", () => {
    expect(localDay("2026-11-12T23:30:00.000Z", "Europe/Madrid")).toBe("2026-11-13");
    expect(localDay("2026-11-12T23:30:00.000Z", "UTC")).toBe("2026-11-12");
    expect(localDay("2026-11-12T23:30:00.000Z", "Not/AZone")).toBe("2026-11-12");

    const stats = summarizeClicks(
      [
        { at: "2026-11-10T10:30:00.000Z", country: "ES", referrer: "instagram.com", count: 2 },
        { at: "2026-11-12T23:30:00.000Z", country: "", referrer: "google.com" },
      ],
      new Date("2026-11-13T08:00:00.000Z"),
      "Europe/Madrid",
    );

    expect(stats.total).toBe(3);
    expect(stats.byDay).toEqual([
      { day: "2026-11-10", clicks: 2 },
      { day: "2026-11-11", clicks: 0 },
      { day: "2026-11-12", clicks: 0 },
      { day: "2026-11-13", clicks: 1 },
    ]);
    expect(stats.countries).toEqual([
      { name: "ES", clicks: 2 },
      { name: "Unknown", clicks: 1 },
    ]);
    expect(stats.referrers).toEqual([
      { name: "instagram.com", clicks: 2 },
      { name: "google.com", clicks: 1 },
    ]);
  });

  it("returns an empty history when nothing has been clicked", () => {
    expect(summarizeClicks([], new Date("2026-11-12T12:00:00.000Z"))).toEqual({
      total: 0,
      byDay: [],
      countries: [],
      referrers: [],
    });
  });
});

describe("sign-in", () => {
  it("hashes passwords and checks them", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("pbkdf2$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
    expect(passwordError("short")).toBeTruthy();
    expect(await secretsMatch("abc", "abc")).toBe(true);
    expect(await secretsMatch("abc", "abd")).toBe(false);
  });

  it("lets Google accounts in by Workspace domain or by being on the team", () => {
    const nobody = () => false;
    const claims = { email: "Ada@Example.com", email_verified: true, hd: "example.com", name: "Ada" };
    expect(googleIdentity(claims, { allowedDomain: "example.com", isKnownEmail: nobody })).toEqual({
      ok: true,
      email: "ada@example.com",
      name: "Ada",
    });
    expect(googleIdentity(claims, { allowedDomain: "", isKnownEmail: nobody })).toMatchObject({ ok: false });
    expect(googleIdentity(claims, { allowedDomain: "", isKnownEmail: (email) => email === "ada@example.com" })).toMatchObject({
      ok: true,
    });
    // A personal Gmail with a matching address but no Workspace hd claim is not let in by domain.
    expect(googleIdentity({ ...claims, hd: undefined }, { allowedDomain: "example.com", isKnownEmail: nobody })).toMatchObject({
      ok: false,
    });
    expect(googleIdentity({ ...claims, email_verified: false }, { allowedDomain: "example.com", isKnownEmail: nobody })).toMatchObject({
      ok: false,
      reason: "unverified",
    });
  });

  it("only turns Google on with a real client id and secret", () => {
    expect(isGoogleConfigured("not-configured", "not-configured")).toBe(false);
    expect(isGoogleConfigured(undefined, undefined)).toBe(false);
    expect(isGoogleConfigured("123.apps.googleusercontent.com", "real-client-secret")).toBe(true);
  });

  it("signs cookies and rejects tampered ones", async () => {
    const token = await signJson({ email: "ada@example.com" }, "secret");
    expect(await readSignedJson(token ?? "", "secret")).toEqual({ email: "ada@example.com" });
    expect(await readSignedJson(token ?? "", "other")).toBeNull();
    expect(await readSignedJson(`${token ?? ""}x`, "secret")).toBeNull();
  });
});

describe("branding", () => {
  it("falls back to safe defaults and validates edits", () => {
    expect(normalizeBrand({}, "Acme Links")).toMatchObject({ name: "Acme Links", color: "#0e7c66", showPoweredBy: true });
    expect(normalizeBrand({ brand_color: "red", brand_logo_url: "javascript:x" }, "")).toMatchObject({
      name: "NotBitLee",
      color: "#0e7c66",
      logoUrl: "",
    });
    expect(brandError({ color: "#12345" })).toBeTruthy();
    expect(brandError({ logoUrl: "javascript:alert(1)" })).toBeTruthy();
    expect(brandError({ name: "Acme", color: "#AABBCC", logoUrl: "", homeUrl: "https://acme.com" })).toBeNull();
  });
});
