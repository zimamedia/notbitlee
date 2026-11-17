import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { LinkCard } from "@/components/link-card.tsx";
import { PageHeader } from "@/components/page-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { formatNumber } from "@/lib/format.ts";
import type { LinkPage } from "@/lib/types.ts";
import { useApi } from "@/lib/use-api.ts";
import { cn } from "@/lib/utils.ts";
import { parseArchiveFilter, type ArchiveFilter } from "../../shared/archive.ts";
import { EmptyLibrary } from "./home-page.tsx";

const LIMIT = 20;

export function LinksPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const status = parseArchiveFilter(params.get("status"));
  const offset = Math.max(0, Number(params.get("offset") ?? "0") || 0);
  const [draft, setDraft] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);

  if (query !== lastQuery) {
    setLastQuery(query);
    setDraft(query);
  }

  const search = new URLSearchParams({ q: query, status, limit: String(LIMIT), offset: String(offset) });
  const page = useApi<LinkPage>(`/api/links?${search.toString()}`);

  function update(next: { q?: string; status?: ArchiveFilter; offset?: number }) {
    const merged = new URLSearchParams(params);
    if (next.q) merged.set("q", next.q);
    else if (next.q !== undefined) merged.delete("q");
    if (next.status === "active") merged.delete("status");
    else if (next.status !== undefined) merged.set("status", next.status);
    const nextOffset = next.offset ?? 0;
    if (nextOffset) merged.set("offset", String(nextOffset));
    else merged.delete("offset");
    setParams(merged);
  }

  const total = page.data?.total ?? 0;

  return (
    <section>
      <PageHeader
        title="Links"
        description={page.data ? `${formatNumber(total)} ${total === 1 ? "link" : "links"}` : "Loading…"}
        actions={
          <Button asChild>
            <Link to="/links/new">
              <Plus aria-hidden="true" size={16} /> Create link
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form
          className="relative flex-1"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: draft.trim() });
          }}
        >
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" size={17} />
          <Input aria-label="Search links" className="pl-9" placeholder="Search by title, back-half or destination" value={draft} onChange={(event) => setDraft(event.target.value)} />
        </form>
        <div className="flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Show">
          {(["active", "archived", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={status === item}
              onClick={() => update({ status: item, q: query })}
              className={cn("rounded px-3 py-1.5 text-sm font-medium", status === item ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-ink")}
            >
              {item === "active" ? "Active" : item === "archived" ? "Archived" : "All"}
            </button>
          ))}
        </div>
      </div>

      {page.error ? (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5" role="alert">
          <p>Could not load links. {page.error}</p>
          <Button className="mt-3" variant="outline" onClick={page.reload}>
            Try again
          </Button>
        </div>
      ) : null}

      {page.loading && !page.data ? (
        <div className="mt-6 space-y-3" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-hover" />
          ))}
        </div>
      ) : null}

      {page.data && page.data.links.length === 0 ? (
        query || status !== "active" ? (
          <div className="mt-6 rounded-lg border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            {query ? `Nothing matches “${query}”.` : status === "archived" ? "Nothing is archived." : "No links."}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyLibrary />
          </div>
        )
      ) : null}

      {page.data && page.data.links.length > 0 ? (
        <ul className={cn("mt-6 space-y-3", page.loading && "opacity-60")}>
          {page.data.links.map((link) => (
            <LinkCard key={link.slug} link={link} />
          ))}
        </ul>
      ) : null}

      {page.data && total > LIMIT ? (
        <div className="mt-5 flex items-center justify-between text-sm">
          <p className="text-muted">
            {offset + 1}–{Math.min(offset + LIMIT, total)} of {formatNumber(total)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => update({ offset: Math.max(0, offset - LIMIT), q: query, status })}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => update({ offset: offset + LIMIT, q: query, status })}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
