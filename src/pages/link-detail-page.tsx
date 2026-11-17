import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useBrand } from "@/components/brand-context.ts";
import { ClicksChart } from "@/components/clicks-chart.tsx";
import { CopyButton } from "@/components/copy-button.tsx";
import { QrCode } from "@/components/qr-code.tsx";
import { RankedList } from "@/components/ranked-list.tsx";
import { countryName } from "@/lib/country.ts";
import { ShareButton } from "@/components/share-button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardTitle } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input, Textarea } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ApiError, api } from "@/lib/api.ts";
import { formatDate, formatNumber } from "@/lib/format.ts";
import type { ClickStats, LinkRecord } from "@/lib/types.ts";
import { hostOf } from "@/lib/url.ts";
import { useApi } from "@/lib/use-api.ts";
import { destinationError } from "../../shared/destination.ts";
import { displayUrl, shortUrl } from "../../shared/slug.ts";

type Detail = { link: LinkRecord; stats: ClickStats };

export function LinkDetailPage() {
  const { slug = "" } = useParams();
  const detail = useApi<Detail>(`/api/links/${encodeURIComponent(slug)}`);

  return (
    <section>
      <Link className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink" to="/links">
        <ArrowLeft aria-hidden="true" size={16} /> Back to list
      </Link>
      {detail.loading && !detail.data ? <div className="mt-6 h-40 animate-pulse rounded-lg bg-hover" aria-hidden="true" /> : null}
      {detail.error && !detail.data ? (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5" role="alert">
          <p>{detail.error}</p>
          <Button className="mt-3" variant="outline" onClick={detail.reload}>
            Try again
          </Button>
        </div>
      ) : null}
      {detail.data ? <DetailBody detail={detail.data} onChange={detail.setData} /> : null}
    </section>
  );
}

function DetailBody({ detail, onChange }: { detail: Detail; onChange: (detail: Detail) => void }) {
  const { link, stats } = detail;
  const { shortBase, brand } = useBrand();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = shortUrl(shortBase, link.slug);
  const justCreated = params.get("created") === "1";

  async function setArchived(archived: boolean) {
    setBusy(true);
    setError(null);
    try {
      onChange(await api<Detail>(`/api/links/${encodeURIComponent(link.slug)}`, { method: "PATCH", body: JSON.stringify({ archived }) }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update the link.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/links/${encodeURIComponent(link.slug)}`, { method: "DELETE" });
      void navigate("/links");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the link.");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mt-4 space-y-6">
      {justCreated ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand-strong" role="status">
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 aria-hidden="true" size={18} /> Your link is ready.
          </span>
          <button type="button" className="text-xs underline" onClick={() => setParams({})}>
            Dismiss
          </button>
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight break-words">{link.title || hostOf(link.destination) || "Untitled"}</h1>
            <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-lg font-semibold break-all text-brand hover:underline">
              {displayUrl(url)}
            </a>
            <p className="mt-1 flex items-start gap-1 text-sm break-all text-muted">
              <ExternalLink aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
              <a href={`/api/preview-redirect/${encodeURIComponent(link.slug)}`} className="hover:underline" target="_blank" rel="noreferrer">
                {link.destination}
              </a>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <CopyButton value={url} variant="default" />
            <ShareButton url={url} title={link.title} />
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" size={15} /> Edit
            </Button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden="true" size={14} /> {formatDate(link.createdAt)}
            {link.createdBy && link.createdBy !== "bitly-import" ? ` by ${link.createdBy}` : ""}
          </span>
          {link.importedFrom ? (
            <Badge>
              Imported from {link.importedFrom}
              {link.bitlyEngagements ? ` · ${formatNumber(link.bitlyEngagements)} clicks before import` : ""}
            </Badge>
          ) : null}
          {link.archived ? <Badge className="bg-line text-ink">Archived · still redirects</Badge> : null}
          <span className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void setArchived(!link.archived)}>
              {link.archived ? "Restore" : "Archive"}
            </Button>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/5" disabled={busy} onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden="true" size={15} /> Delete
            </Button>
          </span>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Card>
          <CardTitle>Engagements over time</CardTitle>
          <div className="mt-4">
            <ClicksChart days={stats.byDay} />
          </div>
        </Card>
        <Card>
          <CardTitle>QR code</CardTitle>
          <div className="mt-4">
            <QrCode value={url} fileName={`qr-${link.slug}`} color={brand.color} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Locations</CardTitle>
          <div className="mt-4">
            <RankedList rows={stats.countries} empty="No clicks yet." label={countryName} />
          </div>
        </Card>
        <Card>
          <CardTitle>Referrers</CardTitle>
          <div className="mt-4">
            <RankedList rows={stats.referrers} empty="No clicks yet." />
          </div>
        </Card>
      </div>

      <EditDialog open={editing} onOpenChange={setEditing} link={link} onSaved={onChange} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Delete this link?</DialogTitle>
          <DialogDescription>
            {displayUrl(url)} will stop working and its click history is deleted. This cannot be undone. To keep it working but hide it, archive it instead.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              Delete link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditDialog({
  open,
  onOpenChange,
  link,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: LinkRecord;
  onSaved: (detail: Detail) => void;
}) {
  const [title, setTitle] = useState(link.title);
  const [destination, setDestination] = useState(link.destination);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = destinationError(destination);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await api<Detail>(`/api/links/${encodeURIComponent(link.slug)}`, {
          method: "PATCH",
          body: JSON.stringify({ title, destination }),
        }),
      );
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setTitle(link.title);
          setDestination(link.destination);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[min(100%-2rem,32rem)]">
        <DialogTitle>Edit link</DialogTitle>
        <DialogDescription>Changing the destination takes effect immediately. The short link stays the same.</DialogDescription>
        <form className="mt-5 space-y-4" onSubmit={(event) => void save(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-destination">Destination</Label>
            <Textarea id="edit-destination" value={destination} onChange={(event) => setDestination(event.target.value)} />
          </div>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
