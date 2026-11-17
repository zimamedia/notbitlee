import { Bug, ExternalLink, GitPullRequest, Lightbulb, RefreshCw, Scale, ShieldAlert, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { BrandMark } from "@/components/brand.tsx";
import { useBrand } from "@/components/brand-context.ts";
import { PageHeader } from "@/components/page-header.tsx";
import { useSession } from "@/components/session-context.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ApiError, api } from "@/lib/api.ts";
import { applyBrand } from "@/lib/apply-brand.ts";
import { formatNumber } from "@/lib/format.ts";
import { APP_VERSION, PROJECT } from "@/lib/project.ts";
import type { Brand, TeamMember } from "@/lib/types.ts";
import { useApi } from "@/lib/use-api.ts";
import { displayUrl } from "../../shared/slug.ts";

export function SettingsPage() {
  const session = useSession();
  const { brand } = useBrand();
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  return (
    <section className="mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <BrandingSection editable={session.role === "owner"} />
        {session.role === "owner" ? <TeamSection /> : null}
        <ImportSection />
        <DomainsSection />
        {!session.fromConfig ? <AccountSection /> : null}
        {session.role === "owner" || brand.showPoweredBy ? <AboutSection /> : null}
      </div>
    </section>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24 p-6">
      <CardTitle>{title}</CardTitle>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function BrandingSection({ editable }: { editable: boolean }) {
  const { brand, setBrand } = useBrand();
  const [draft, setDraft] = useState<Brand>(brand);
  const [status, setStatus] = useState<{ kind: "idle" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(brand);

  // Preview the colour live, and put it back if the page is left without saving.
  useEffect(() => {
    applyBrand({ ...brand, color: /^#[0-9a-f]{6}$/i.test(draft.color) ? draft.color : brand.color });
    return () => applyBrand(brand);
  }, [draft.color, brand]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: "idle" });
    try {
      const result = await api<{ brand: Brand }>("/api/settings", { method: "PUT", body: JSON.stringify(draft) });
      setBrand(result.brand);
      setDraft(result.brand);
      setStatus({ kind: "saved" });
    } catch (caught) {
      setStatus({ kind: "error", message: caught instanceof ApiError ? caught.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section id="branding" title="Branding" description="Your name, logo and colour appear on the dashboard, the sign-in page and the page people see for a broken link.">
      <form className="grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem]" onSubmit={(event) => void save(event)}>
        <fieldset className="space-y-4" disabled={!editable}>
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Name</Label>
            <Input id="brand-name" value={draft.name} maxLength={40} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-color">Brand colour</Label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Pick a colour"
                className="h-10 w-12 cursor-pointer rounded-md border border-line bg-surface p-1"
                value={/^#[0-9a-f]{6}$/i.test(draft.color) ? draft.color : brand.color}
                onChange={(event) => setDraft({ ...draft, color: event.target.value })}
              />
              <Input id="brand-color" className="font-mono" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-logo">
              Logo URL <span className="font-normal text-faint">(optional)</span>
            </Label>
            <Input id="brand-logo" placeholder="https://example.com/logo.svg" value={draft.logoUrl} onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })} />
            <p className="text-xs text-faint">A wide SVG or PNG on a transparent background works best. It is also used as the browser tab icon.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-home">
              Home page <span className="font-normal text-faint">(optional)</span>
            </Label>
            <Input id="brand-home" placeholder="https://example.com" value={draft.homeUrl} onChange={(event) => setDraft({ ...draft, homeUrl: event.target.value })} />
            <p className="text-xs text-faint">Where people go when they visit your short domain with nothing after it. Empty sends them to this dashboard.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              checked={draft.showPoweredBy}
              onChange={(event) => setDraft({ ...draft, showPoweredBy: event.target.checked })}
            />
            Show “Powered by NotBitLee”
          </label>
        </fieldset>
        <div>
          <p className="text-sm font-medium">Preview</p>
          <div className="mt-2 rounded-lg border border-line bg-canvas p-4">
            <BrandMark brand={{ ...draft, logoUrl: /^https?:\/\//.test(draft.logoUrl) ? draft.logoUrl : "" }} />
            <div className="mt-4 h-9 rounded-md bg-brand text-center text-sm leading-9 font-semibold text-on-brand">Create new</div>
            <p className="mt-3 text-sm font-semibold text-brand">example.link/spring</p>
          </div>
        </div>
        {editable ? (
          <div className="flex items-center gap-3 md:col-span-2">
            <Button type="submit" disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save branding"}
            </Button>
            {dirty ? (
              <Button variant="ghost" onClick={() => setDraft(brand)}>
                Reset
              </Button>
            ) : null}
            {status.kind === "saved" ? <span className="text-sm text-muted">Saved.</span> : null}
            {status.kind === "error" ? (
              <span className="text-sm text-danger" role="alert">
                {status.message}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted md:col-span-2">Only an owner can change branding.</p>
        )}
      </form>
    </Section>
  );
}

function TeamSection() {
  const session = useSession();
  const team = useApi<{ team: TeamMember[] }>("/api/team");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      team.setData(await api<{ team: TeamMember[] }>("/api/team", { method: "POST", body: JSON.stringify({ email, name, password, role }) }));
      setEmail("");
      setName("");
      setPassword("");
      setRole("member");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not add that person.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: TeamMember) {
    if (!window.confirm(`Remove ${member.email}? They are signed out at once.`)) return;
    try {
      team.setData(await api<{ team: TeamMember[] }>(`/api/team/${encodeURIComponent(member.email)}`, { method: "DELETE" }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not remove that person.");
    }
  }

  return (
    <Section id="team" title="Team" description="Everyone here can create and edit links. Owners can also change settings and the team. No per-seat fees.">
      <ul className="divide-y divide-line rounded-md border border-line">
        {team.data?.team.map((member) => (
          <li key={member.email} className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong" aria-hidden="true">
              {(member.name || member.email).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.name || member.email}
                {member.email === session.email ? <span className="font-normal text-faint"> (you)</span> : null}
              </p>
              <p className="truncate text-xs text-muted">
                {member.name ? `${member.email} · ` : ""}
                {member.fromConfig ? "Admin from ADMIN_EMAIL" : member.hasPassword ? "Password sign-in" : "Google sign-in"}
              </p>
            </div>
            <Badge className={member.role === "owner" ? "bg-brand-soft text-brand-strong" : ""}>{member.role === "owner" ? "Owner" : "Member"}</Badge>
            {!member.fromConfig && member.email !== session.email ? (
              <Button variant="ghost" size="icon" aria-label={`Remove ${member.email}`} onClick={() => void remove(member)}>
                <Trash2 aria-hidden="true" size={16} />
              </Button>
            ) : (
              <span className="size-9" />
            )}
          </li>
        ))}
        {team.loading && !team.data ? <li className="px-4 py-3 text-sm text-muted">Loading team…</li> : null}
      </ul>

      <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void add(event)}>
        <p className="text-sm font-medium sm:col-span-2">Add someone</p>
        <div className="space-y-1.5">
          <Label htmlFor="team-email">Email</Label>
          <Input id="team-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-name">
            Name <span className="font-normal text-faint">(optional)</span>
          </Label>
          <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-password">Temporary password</Label>
          <Input id="team-password" type="text" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" />
          <p className="text-xs text-faint">Leave empty if they will sign in with Google. They can change it in Settings.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team-role">Role</Label>
          <select
            id="team-role"
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value === "owner" ? "owner" : "member")}
          >
            <option value="member">Member: links only</option>
            <option value="owner">Owner: links, settings and team</option>
          </select>
        </div>
        {error ? (
          <p className="text-sm text-danger sm:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add to team"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function ImportSection() {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "busy"; file: string } | { kind: "done"; found: number; added: number; skipped: number } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function upload(file: File) {
    setState({ kind: "busy", file: file.name });
    try {
      const result = await api<{ found: number; added: number; skipped: number }>("/api/import", {
        method: "POST",
        body: await file.text(),
        headers: { "content-type": "text/csv" },
      });
      setState({ kind: "done", ...result });
    } catch (caught) {
      setState({ kind: "error", message: caught instanceof ApiError ? caught.message : "The import failed." });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <Section
      id="import"
      title="Import from Bitly"
      description={
        <>
          In Bitly, open <strong>Links</strong>, select all, and choose <strong>Export</strong>. Upload the CSV here. Each link keeps its back-half, title and destination. Back-halves
          that already exist here are skipped, so importing twice is safe.
        </>
      }
    >
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        id="import-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button variant="outline" disabled={state.kind === "busy"} onClick={() => input.current?.click()}>
        <Upload aria-hidden="true" size={16} />
        {state.kind === "busy" ? `Importing ${state.file}…` : "Choose CSV file"}
      </Button>
      <div aria-live="polite">
        {state.kind === "done" ? (
          <p className="mt-3 text-sm">
            Found {formatNumber(state.found)} links: <strong>{formatNumber(state.added)} added</strong>, {formatNumber(state.skipped)} skipped because the back-half was already
            taken.
          </p>
        ) : null}
        {state.kind === "error" ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {state.message}
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-faint">
        Links on your own Bitly custom domain keep working once that domain points here. Plain <code>bit.ly</code> links are copied to the same back-half on your domain, but the old{" "}
        <code>bit.ly</code> addresses stop working if you close your Bitly account.
      </p>
    </Section>
  );
}

function DomainsSection() {
  const { shortBase } = useBrand();
  return (
    <Section id="domains" title="Domains" description="Short links are served from this Worker on your own Cloudflare account.">
      <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
        <dt className="text-muted">Short links</dt>
        <dd className="font-medium break-all">{displayUrl(shortBase)}</dd>
        <dt className="text-muted">Dashboard</dt>
        <dd className="font-medium break-all">{displayUrl(`${window.location.origin}/admin`)}</dd>
      </dl>
      <div className="mt-4 rounded-md bg-canvas p-4 text-sm text-muted">
        <p className="font-medium text-ink">Use your own domain</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Add the domain to your Cloudflare account, if it is not there yet.</li>
          <li>
            Open this Worker, go to <strong>Settings → Domains &amp; Routes</strong> and add it as a <strong>Custom domain</strong>.
          </li>
          <li>
            Set the <code className="font-mono text-ink">SHORT_DOMAIN</code> variable to it, so links are shown and copied with that domain.
          </li>
        </ol>
      </div>
    </Section>
  );
}

function AccountSection() {
  const session = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "idle" });
    try {
      await api("/api/me/password", { method: "POST", body: JSON.stringify({ current, next }) });
      setCurrent("");
      setNext("");
      setStatus({ kind: "saved" });
    } catch (caught) {
      setStatus({ kind: "error", message: caught instanceof ApiError ? caught.message : "Could not change the password." });
    }
  }

  return (
    <Section id="account" title="Your account" description={`Signed in as ${session.email}.`}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void save(event)}>
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="outline" disabled={!next}>
            Change password
          </Button>
          {status.kind === "saved" ? <span className="text-sm text-muted">Password changed.</span> : null}
          {status.kind === "error" ? (
            <span className="text-sm text-danger" role="alert">
              {status.message}
            </span>
          ) : null}
        </div>
      </form>
    </Section>
  );
}

function AboutSection() {
  const links = [
    { href: PROJECT.bug, label: "Report a bug", icon: Bug },
    { href: PROJECT.feature, label: "Suggest a feature", icon: Lightbulb },
    { href: PROJECT.contributing, label: "Contribute code", icon: GitPullRequest },
    { href: PROJECT.updating, label: "How to update", icon: RefreshCw },
    { href: PROJECT.security, label: "Report a security issue", icon: ShieldAlert },
    { href: PROJECT.license, label: "MIT licence", icon: Scale },
  ];
  return (
    <Section
      id="about"
      title="About NotBitLee"
      description="This dashboard runs NotBitLee, free and open-source software. Your copy is yours: you can read, change and redeploy every line of it."
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
        <dt className="text-muted">Version</dt>
        <dd className="font-medium">
          {APP_VERSION}{" "}
          <a className="ml-2 font-normal text-brand hover:underline" href={PROJECT.changelog} target="_blank" rel="noreferrer">
            What&apos;s new
          </a>
        </dd>
        <dt className="text-muted">Source code</dt>
        <dd>
          <a className="inline-flex items-center gap-1 font-medium text-brand hover:underline" href={PROJECT.repo} target="_blank" rel="noreferrer">
            github.com/zimamedia/notbitlee <ExternalLink aria-hidden="true" size={13} />
          </a>
        </dd>
      </dl>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-md border border-line px-3 py-2.5 text-sm font-medium text-ink hover:bg-hover"
            >
              <link.icon aria-hidden="true" size={16} className="text-muted" />
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-faint">
        Made by{" "}
        <a className="font-medium text-muted hover:underline" href={PROJECT.maker} target="_blank" rel="noreferrer">
          Zima Media
        </a>
        . Released under the MIT licence.
      </p>
    </Section>
  );
}
