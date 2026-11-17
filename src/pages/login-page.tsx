import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { useBrand } from "@/components/brand-context.ts";
import { BrandMark } from "@/components/brand.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ApiError, api } from "@/lib/api.ts";
import { PROJECT } from "@/lib/project.ts";
import type { SessionUser } from "@/lib/types.ts";

export function LoginPage() {
  const { brand, signIn } = useBrand();
  const [params] = useSearchParams();
  const [session, setSession] = useState<"checking" | "anonymous" | "signed-in">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(loginMessage(params.get("error")));
  const [busy, setBusy] = useState(false);
  const nothingSetUp = !signIn.password && !signIn.google;

  useEffect(() => {
    let cancelled = false;
    api<SessionUser>("/api/me")
      .then(() => {
        if (!cancelled) setSession("signed-in");
      })
      .catch(() => {
        if (!cancelled) setSession("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/password", { method: "POST", body: JSON.stringify({ email, password }) });
      setSession("signed-in");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in.");
      setBusy(false);
    }
  }

  if (session === "signed-in") return <Navigate to="/" replace />;

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark brand={brand} size="lg" />
        </div>
        <section className="rounded-lg border border-line bg-surface p-7 shadow-sm">
          <h1 className="text-xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Manage your short links, QR codes and click analytics.</p>

          {error ? (
            <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          {nothingSetUp ? (
            <div className="mt-5 rounded-md bg-canvas p-4 text-sm text-muted">
              <p className="font-semibold text-ink">Sign-in is not set up yet</p>
              <p className="mt-1">
                In your Cloudflare dashboard, open this Worker, go to <strong>Settings → Variables and Secrets</strong>, and add two secrets:{" "}
                <code className="font-mono text-ink">ADMIN_EMAIL</code> and <code className="font-mono text-ink">ADMIN_PASSWORD</code>. Then reload this page.
              </p>
            </div>
          ) : null}

          {signIn.password ? (
            <form className="mt-5 space-y-4" onSubmit={(event) => void onSubmit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : null}

          {signIn.password && signIn.google ? (
            <div className="my-5 flex items-center gap-3 text-xs text-faint" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
          ) : null}

          {signIn.google ? (
            <Button asChild variant="outline" className={signIn.password ? "w-full" : "mt-5 w-full"} size="lg">
              <a href="/api/auth/google">Continue with Google</a>
            </Button>
          ) : null}

          {session === "checking" ? <p className="mt-4 text-xs text-faint">Checking for an existing session…</p> : null}
        </section>
        {brand.showPoweredBy ? (
          <p className="mt-6 text-center text-xs text-faint">
            Powered by{" "}
            <a className="font-medium hover:text-muted" href={PROJECT.repo} target="_blank" rel="noreferrer">
              NotBitLee
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function loginMessage(error: string | null): string | null {
  switch (error) {
    case "not-allowed":
      return "That Google account does not have access. Ask an owner to add you in Settings → Team.";
    case "config":
      return "Google sign-in is not set up for this dashboard.";
    case "oauth":
      return "Google did not complete sign-in. Try again.";
    default:
      return null;
  }
}
