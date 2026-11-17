import { ChevronDown } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useBrand } from "@/components/brand-context.ts";
import { PageHeader } from "@/components/page-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ApiError, api } from "@/lib/api.ts";
import type { LinkRecord } from "@/lib/types.ts";
import { UTM_FIELDS, withUtm, type UtmKey } from "@/lib/utm.ts";
import { destinationError } from "../../shared/destination.ts";
import { displayUrl, slugError } from "../../shared/slug.ts";

export function NewLinkPage() {
  const navigate = useNavigate();
  const { shortBase } = useBrand();
  const [destination, setDestination] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [utmOpen, setUtmOpen] = useState(false);
  const [utm, setUtm] = useState<Partial<Record<UtmKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const finalDestination = withUtm(destination.trim(), utm);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = destinationError(finalDestination) ?? (slug.trim() ? slugError(slug.trim()) : null);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api<{ link: LinkRecord }>("/api/links", {
        method: "POST",
        body: JSON.stringify({ title, destination: finalDestination, slug: slug.trim() }),
      });
      void navigate(`/links/${encodeURIComponent(created.link.slug)}?created=1`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the link.");
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <PageHeader title="Create a link" />
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <Card className="space-y-5 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              required
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="https://example.com/my-long-url"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Title <span className="font-normal text-faint">(optional)</span>
            </Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Spring newsletter" />
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle>Short link</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" value={displayUrl(shortBase)} readOnly disabled className="bg-canvas" />
            </div>
            <span className="hidden pb-2.5 text-lg text-faint sm:block" aria-hidden="true">
              /
            </span>
            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Custom back-half <span className="font-normal text-faint">(optional)</span>
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="spring-sale"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-faint">Leave the back-half empty and a random one is picked.</p>
        </Card>

        <Card className="p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-4 text-left"
            aria-expanded={utmOpen}
            onClick={() => setUtmOpen((value) => !value)}
          >
            <span>
              <span className="block text-base font-semibold">UTM parameters</span>
              <span className="text-sm text-muted">Tag the destination so your analytics tool knows where visits came from.</span>
            </span>
            <ChevronDown aria-hidden="true" size={18} className={utmOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {utmOpen ? (
            <div className="border-t border-line px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {UTM_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      placeholder={field.placeholder}
                      value={utm[field.key] ?? ""}
                      onChange={(event) => setUtm((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  </div>
                ))}
              </div>
              {finalDestination !== destination.trim() ? (
                <p className="mt-4 rounded-md bg-canvas px-3 py-2 font-mono text-xs break-all text-muted">{finalDestination}</p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link to="/links">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create your link"}
          </Button>
        </div>
      </form>
    </section>
  );
}
