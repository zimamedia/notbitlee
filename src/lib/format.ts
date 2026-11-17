const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const shortDayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
const longDayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat();

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormat.format(date);
}

/** Formats a YYYY-MM-DD calendar day without shifting it into the browser's time zone. */
export function formatDay(day: string, long = false): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  const value = new Date(Date.UTC(year, month - 1, date, 12));
  return (long ? longDayFormat : shortDayFormat).format(value);
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function plural(count: number, one: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}
