import { ArrowRight, Link2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useBrand } from "@/components/brand-context.ts";
import { ClicksChart } from "@/components/clicks-chart.tsx";
import { LinkCard } from "@/components/link-card.tsx";
import { PageHeader, StatTile } from "@/components/page-header.tsx";
import { useSession } from "@/components/session-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ApiError, api } from "@/lib/api.ts";
import { formatNumber } from "@/lib/format.ts";
import type { LibraryStats, LinkPage, LinkRecord } from "@/lib/types.ts";
import { useApi } from "@/lib/use-api.ts";
import { destinationError } from "../../shared/destination.ts";
import { displayUrl } from "../../shared/slug.ts";

export function HomePage() {
  const session = useSession();
  const stats = useApi<LibraryStats>("/api/stats");
  const recent = useApi<LinkPage>("/api/links?limit=5");
  const firstName = (session.name || session.email).split(/[ @]/)[0];

  return (
    <section>
      <PageHeader title={`Welcome, ${firstName}`} description="Create a short link, then watch the clicks come in." />
      <QuickCreate />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Links" value={stats.data ? formatNumber(stats.data.counts.links) : "–"} hint={stats.data ? `${formatNumber(stats.data.counts.active)} active` : undefined} />
        <StatTile label="Total clicks" value={stats.data ? formatNumber(stats.data.counts.clicks) : "–"} />
        <StatTile label="Clicks, last 7 days" value={stats.data ? formatNumber(stats.data.counts.last7Days) : "–"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>Clicks over time</CardTitle>
          <div className="mt-4">
            {stats.error ? <p className="text-sm text-danger">{stats.error}</p> : stats.data ? <ClicksChart days={stats.data.clicks.byDay} /> : <Skeleton />}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Top links</CardTitle>
            <Link to="/analytics" className="text-sm font-medium text-brand hover:underline">
              Analytics
            </Link>
          </div>
          <TopLinks links={stats.data?.topLinks ?? null} />
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent links</h2>
          <Link to="/links" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            View all <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
        {recent.data && recent.data.links.length === 0 ? <EmptyLibrary /> : null}
        <ul className="space-y-3">{recent.data?.links.map((link) => <LinkCard key={link.slug} link={link} />)}</ul>
      </div>
    </section>
  );
}

function QuickCreate() {
  const navigate = useNavigate();
  const { shortBase } = useBrand();
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = destinationError(destination);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ link: LinkRecord }>("/api/links", { method: "POST", body: JSON.stringify({ destination }) });
      void navigate(`/links/${encodeURIComponent(created.link.slug)}?created=1`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the link.");
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <CardTitle className="flex items-center gap-2">
        <Link2 aria-hidden="true" size={18} className="text-brand" /> Make a short link
      </CardTitle>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="quick-destination" className="sr-only">
          Long URL
        </label>
        <Input
          id="quick-destination"
          className="h-11 flex-1"
          placeholder="Paste a long URL, e.g. https://example.com/my-long-url"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
        />
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Creating…" : "Create link"}
        </Button>
      </form>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-faint">
          Links are created on <span className="font-medium text-muted">{displayUrl(shortBase)}</span>. Want a custom back-half or UTM tags?{" "}
          <Link to="/links/new" className="font-medium text-brand hover:underline">
            Use the full form
          </Link>
          .
        </p>
      )}
    </Card>
  );
}

function TopLinks({ links }: { links: LinkRecord[] | null }) {
  const { shortBase } = useBrand();
  if (!links) return <Skeleton />;
  if (links.length === 0) return <p className="mt-6 text-center text-sm text-muted">Clicked links will be ranked here.</p>;
  return (
    <ol className="mt-4 space-y-3">
      {links.slice(0, 6).map((link, index) => (
        <li key={link.slug} className="flex items-center gap-3">
          <span className="w-4 text-right text-xs font-semibold text-faint tabular-nums">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <Link to={`/links/${encodeURIComponent(link.slug)}`} className="block truncate text-sm font-medium text-ink hover:underline">
              {link.title || displayUrl(`${shortBase}/${link.slug}`)}
            </Link>
            <p className="truncate text-xs text-brand">{displayUrl(`${shortBase}/${link.slug}`)}</p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatNumber(link.clicks)}</span>
        </li>
      ))}
    </ol>
  );
}

export function EmptyLibrary() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
      <p className="font-semibold">No links yet</p>
      <p className="mt-1 text-sm text-muted">Create your first link above, or bring everything over from Bitly.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button asChild>
          <Link to="/links/new">Create a link</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/settings#import">Import from Bitly</Link>
        </Button>
      </div>
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-8 animate-pulse rounded bg-hover" />
      ))}
    </div>
  );
}
