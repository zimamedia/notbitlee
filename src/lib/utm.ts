export const UTM_FIELDS = [
  { key: "utm_source", label: "Source", placeholder: "newsletter" },
  { key: "utm_medium", label: "Medium", placeholder: "email" },
  { key: "utm_campaign", label: "Campaign", placeholder: "spring-sale" },
  { key: "utm_term", label: "Term", placeholder: "optional" },
  { key: "utm_content", label: "Content", placeholder: "optional" },
] as const;

export type UtmKey = (typeof UTM_FIELDS)[number]["key"];

export function withUtm(destination: string, utm: Partial<Record<UtmKey, string>>): string {
  const entries = Object.entries(utm).filter(([, value]) => value && value.trim());
  if (entries.length === 0) return destination;
  try {
    const url = new URL(destination);
    for (const [key, value] of entries) url.searchParams.set(key, (value ?? "").trim());
    return url.toString();
  } catch {
    return destination;
  }
}

