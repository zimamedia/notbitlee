import { useMemo, useState } from "react";

import { formatDay, formatNumber } from "@/lib/format.ts";
import type { DayStat } from "@/lib/types.ts";
import { cn } from "@/lib/utils.ts";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "All time" },
] as const;

/** Single-series bar chart of clicks per day: one hue, thin bars, hover tooltip, and a table view. */
export function ClicksChart({ days }: { days: DayStat[] }) {
  const [range, setRange] = useState<number>(30);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const visible = useMemo(() => padRange(days, range), [days, range]);
  const max = Math.max(1, ...visible.map((day) => day.clicks));
  const total = visible.reduce((sum, day) => sum + day.clicks, 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] ?? max;
  const labelEvery = Math.max(1, Math.ceil(visible.length / 5));
  const hovered = hover === null ? null : visible[hover];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="text-2xl font-semibold text-ink tabular-nums">{formatNumber(total)}</span> clicks
          {range ? ` in the last ${range} days` : " in total"}
        </p>
        <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Date range">
          {RANGES.map((item) => (
            <button
              key={item.days}
              type="button"
              aria-pressed={range === item.days}
              onClick={() => setRange(item.days)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium",
                range === item.days ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No clicks yet. Share a link to see activity here.</p>
      ) : (
        <div className="relative mt-5">
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2">
            <div className="relative h-48 text-right text-[11px] text-faint tabular-nums" aria-hidden="true">
              {ticks.map((tick) => (
                <span key={tick} className="absolute right-0 leading-none" style={{ bottom: `calc(${(tick / top) * 100}% - 0.35em)` }}>
                  {formatNumber(tick)}
                </span>
              ))}
            </div>
            <div className="relative h-48" onMouseLeave={() => setHover(null)}>
              {ticks.map((tick) => (
                <div key={tick} className="absolute inset-x-0 border-t border-line/70" style={{ bottom: `${(tick / top) * 100}%` }} aria-hidden="true" />
              ))}
              <div className="absolute inset-0 flex items-end gap-[2px]" role="img" aria-label={`Clicks per day, ${formatNumber(total)} in total`}>
                {visible.map((day, index) => (
                  <div
                    key={day.day}
                    className="flex h-full min-w-0 flex-1 items-end"
                    onMouseEnter={() => setHover(index)}
                    onFocus={() => setHover(index)}
                    tabIndex={-1}
                  >
                    <div
                      className={cn("w-full max-w-6 mx-auto rounded-t-[4px] bg-brand transition-opacity", hover !== null && hover !== index && "opacity-50")}
                      style={{ height: day.clicks === 0 ? "0" : `max(3px, ${(day.clicks / top) * 100}%)` }}
                    />
                  </div>
                ))}
              </div>
              {hovered ? (
                <div
                  className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
                  style={{ left: `clamp(4rem, ${((hover ?? 0) + 0.5) * (100 / visible.length)}%, calc(100% - 4rem))` }}
                >
                  <p className="text-muted">{formatDay(hovered.day, true)}</p>
                  <p className="font-semibold text-ink tabular-nums">{plural(hovered.clicks)}</p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-2 ml-12 flex text-[11px] text-faint" aria-hidden="true">
            {visible.map((day, index) => (
              <span key={day.day} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
                {index % labelEvery === 0 ? formatDay(day.day) : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {visible.length > 0 ? (
        <div className="mt-3">
          <button type="button" className="text-xs font-medium text-muted underline-offset-2 hover:underline" onClick={() => setShowTable((value) => !value)}>
            {showTable ? "Hide table" : "Show as table"}
          </button>
          {showTable ? (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-canvas text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Day</th>
                    <th className="px-3 py-2 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {[...visible].reverse().map((day) => (
                    <tr key={day.day} className="border-t border-line">
                      <td className="px-3 py-1.5">{formatDay(day.day, true)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(day.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function plural(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? "click" : "clicks"}`;
}

/** The last `range` days ending today (UTC calendar), filling empty days with zero. 0 means everything. */
function padRange(days: DayStat[], range: number): DayStat[] {
  if (days.length === 0) return [];
  if (range === 0) return days;
  const counts = new Map(days.map((day) => [day.day, day.clicks]));
  const last = days[days.length - 1]?.day ?? new Date().toISOString().slice(0, 10);
  const end = new Date(`${last}T12:00:00Z`);
  const result: DayStat[] = [];
  for (let offset = range - 1; offset >= 0; offset -= 1) {
    const date = new Date(end.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
    result.push({ day: date, clicks: counts.get(date) ?? 0 });
  }
  return result;
}

function niceTicks(max: number): number[] {
  const rough = max / 3;
  const power = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? power * 10;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step - 1; value += step) ticks.push(value);
  if ((ticks[ticks.length - 1] ?? 0) < max) ticks.push((ticks[ticks.length - 1] ?? 0) + step);
  return ticks;
}
