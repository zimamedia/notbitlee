import { ClicksChart } from "@/components/clicks-chart.tsx";
import { PageHeader, StatTile } from "@/components/page-header.tsx";
import { RankedList } from "@/components/ranked-list.tsx";
import { countryName } from "@/lib/country.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardTitle } from "@/components/ui/card.tsx";
import { formatNumber } from "@/lib/format.ts";
import type { LibraryStats } from "@/lib/types.ts";
import { useApi } from "@/lib/use-api.ts";
import { useBrand } from "@/components/brand-context.ts";
import { Skeleton } from "./home-page.tsx";

export function AnalyticsPage() {
  const stats = useApi<LibraryStats>("/api/stats");
  const { timeZone } = useBrand();
  const data = stats.data;

  return (
    <section>
      <PageHeader title="Analytics" description={`Every click on every link. Days follow the ${timeZone} time zone.`} />
      {stats.error ? (
        <div className="rounded-lg border border-line bg-surface p-5" role="alert">
          <p>Could not load analytics. {stats.error}</p>
          <Button className="mt-3" variant="outline" onClick={stats.reload}>
            Try again
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total clicks" value={data ? formatNumber(data.counts.clicks) : "–"} />
        <StatTile label="Clicks, last 7 days" value={data ? formatNumber(data.counts.last7Days) : "–"} />
        <StatTile label="Countries reached" value={data ? formatNumber(data.clicks.countries.filter((row) => row.name !== "Unknown").length) : "–"} />
      </div>
      <Card className="mt-6">
        <CardTitle>Clicks over time</CardTitle>
        <div className="mt-4">{data ? <ClicksChart days={data.clicks.byDay} /> : <Skeleton />}</div>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle>Top links</CardTitle>
          <div className="mt-4">
            {data ? (
              <RankedList rows={data.topLinks.map((link) => ({ name: link.title || `/${link.slug}`, clicks: link.clicks }))} empty="No clicks yet." />
            ) : (
              <Skeleton />
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Locations</CardTitle>
          <div className="mt-4">{data ? <RankedList rows={data.clicks.countries} empty="No clicks yet." label={countryName} /> : <Skeleton />}</div>
        </Card>
        <Card>
          <CardTitle>Referrers</CardTitle>
          <div className="mt-4">{data ? <RankedList rows={data.clicks.referrers} empty="No clicks yet." /> : <Skeleton />}</div>
        </Card>
      </div>
    </section>
  );
}
