import { BarChart2, CalendarDays, Pencil, QrCode as QrIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useBrand } from "@/components/brand-context.ts";
import { CopyButton } from "@/components/copy-button.tsx";
import { QrCode } from "@/components/qr-code.tsx";
import { ShareButton } from "@/components/share-button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import { formatDate, plural } from "@/lib/format.ts";
import type { LinkRecord } from "@/lib/types.ts";
import { hostOf } from "@/lib/url.ts";
import { displayUrl, shortUrl } from "../../shared/slug.ts";

export function LinkCard({ link }: { link: LinkRecord }) {
  const { shortBase, brand } = useBrand();
  const [qrOpen, setQrOpen] = useState(false);
  const url = shortUrl(shortBase, link.slug);
  const detail = `/links/${encodeURIComponent(link.slug)}`;
  const host = hostOf(link.destination);

  return (
    <li className="rounded-lg border border-line bg-surface p-4 transition-shadow hover:shadow-sm sm:p-5">
      <div className="flex gap-4">
        <span className="hidden size-10 shrink-0 place-items-center rounded-full border border-line bg-canvas text-sm font-semibold text-muted sm:grid" aria-hidden="true">
          {(host || "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link to={detail} className="block truncate text-base font-semibold text-ink hover:underline">
                {link.title || host || "Untitled"}
              </Link>
              <a href={url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-sm font-semibold text-brand hover:underline">
                {displayUrl(url)}
              </a>
              <p className="mt-0.5 truncate text-sm text-muted" title={link.destination}>
                {link.destination}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <CopyButton value={url} />
              <ShareButton url={url} title={link.title} />
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)} aria-label={`QR code for ${displayUrl(url)}`}>
                <QrIcon aria-hidden="true" size={15} />
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={detail} aria-label={`Edit ${displayUrl(url)}`}>
                  <Pencil aria-hidden="true" size={15} />
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <Link to={detail} className="inline-flex items-center gap-1 font-medium hover:text-ink">
              <BarChart2 aria-hidden="true" size={14} />
              {plural(link.clicks, "click", "clicks")}
            </Link>
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden="true" size={14} />
              {formatDate(link.createdAt)}
            </span>
            {link.importedFrom ? <Badge>Imported from {link.importedFrom}</Badge> : null}
            {link.archived ? <Badge className="bg-line text-ink">Archived</Badge> : null}
          </div>
        </div>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogTitle>QR code</DialogTitle>
          <DialogDescription>{displayUrl(url)}</DialogDescription>
          <div className="mt-5">
            <QrCode value={url} fileName={`qr-${link.slug}`} color={brand.color} />
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
