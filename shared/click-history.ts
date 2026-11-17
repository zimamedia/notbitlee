export type DayStat = { day: string; clicks: number };
export type NamedStat = { name: string; clicks: number };

export type ClickEvent = {
  at: string;
  country: string | null;
  referrer: string | null;
  /** How many clicks this row stands for. Rows grouped by hour carry a count; single clicks leave it out. */
  count?: number;
};

export type ClickStats = {
  total: number;
  byDay: DayStat[];
  countries: NamedStat[];
  referrers: NamedStat[];
};

const calendars = new Map<string, Intl.DateTimeFormat>();

export function safeTimeZone(timeZone: string | undefined): string {
  const zone = (timeZone ?? "").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

/** The calendar day (YYYY-MM-DD) of an instant in the given time zone. */
export function localDay(iso: string, timeZone = "UTC"): string {
  const zone = safeTimeZone(timeZone);
  let calendar = calendars.get(zone);
  if (!calendar) {
    calendar = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
    calendars.set(zone, calendar);
  }
  return calendar.format(new Date(iso));
}

export function summarizeClicks(events: ClickEvent[], now = new Date(), timeZone = "UTC"): ClickStats {
  const dayCounts = new Map<string, number>();
  const countries = new Map<string, number>();
  const referrers = new Map<string, number>();

  let total = 0;
  for (const event of events) {
    const count = event.count ?? 1;
    total += count;
    const day = localDay(event.at, timeZone);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + count);
    addCount(countries, event.country?.trim() || "Unknown", count);
    addCount(referrers, event.referrer?.trim() || "Direct", count);
  }

  return {
    total,
    byDay: fillDays(dayCounts, localDay(now.toISOString(), timeZone)),
    countries: ranked(countries),
    referrers: ranked(referrers),
  };
}

function addCount(counts: Map<string, number>, name: string, count: number): void {
  counts.set(name, (counts.get(name) ?? 0) + count);
}

function ranked(counts: Map<string, number>): NamedStat[] {
  return [...counts.entries()]
    .map(([name, clicks]) => ({ name, clicks }))
    .sort((left, right) => right.clicks - left.clicks || left.name.localeCompare(right.name));
}

function fillDays(counts: Map<string, number>, today: string): DayStat[] {
  const first = [...counts.keys()].sort()[0];
  if (!first) return [];
  const end = today < first ? first : today;
  const days: DayStat[] = [];
  for (let day = first; day <= end; day = nextDay(day)) {
    days.push({ day, clicks: counts.get(day) ?? 0 });
  }
  return days;
}

function nextDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (date ?? 1) + 1)).toISOString().slice(0, 10);
}
