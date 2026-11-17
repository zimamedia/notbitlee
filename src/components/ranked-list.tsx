import { formatNumber } from "@/lib/format.ts";
import type { NamedStat } from "@/lib/types.ts";

/** Ranked horizontal bars: one hue, value as text beside each bar, so nothing depends on colour. */
export function RankedList({ rows, empty, label = (name: string) => name, limit = 8 }: { rows: NamedStat[]; empty: string; label?: (name: string) => string; limit?: number }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((sum, row) => sum + row.clicks, 0);
  const all = rest > 0 ? [...shown, { name: "Other", clicks: rest }] : shown;
  const total = rows.reduce((sum, row) => sum + row.clicks, 0);
  const max = Math.max(1, ...all.map((row) => row.clicks));

  return (
    <ul className="space-y-2.5">
      {all.map((row) => {
        const share = total ? Math.round((row.clicks / total) * 100) : 0;
        return (
          <li key={row.name} title={`${label(row.name)}: ${formatNumber(row.clicks)} clicks (${share}%)`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink">{row.name === "Other" ? "Other" : label(row.name)}</span>
              <span className="shrink-0 text-muted tabular-nums">
                {formatNumber(row.clicks)} <span className="text-faint">· {share}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-hover">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (row.clicks / max) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
