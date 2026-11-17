export type Brand = {
  name: string;
  color: string;
  logoUrl: string;
  homeUrl: string;
  showPoweredBy: boolean;
};

export const DEFAULT_BRAND: Brand = {
  name: "NotBitLee",
  color: "#0e7c66",
  logoUrl: "",
  homeUrl: "",
  showPoweredBy: true,
};

const HEX = /^#[0-9a-f]{6}$/i;

export function brandError(brand: Partial<Brand>): string | null {
  if (brand.name !== undefined) {
    const name = brand.name.trim();
    if (!name) return "Enter a brand name.";
    if (name.length > 40) return "Keep the brand name under 40 characters.";
  }
  if (brand.color !== undefined && !HEX.test(brand.color.trim())) return "Use a colour like #0e7c66.";
  if (brand.logoUrl !== undefined && brand.logoUrl.trim() && !isHttpUrl(brand.logoUrl)) {
    return "The logo must be an https:// image URL.";
  }
  if (brand.homeUrl !== undefined && brand.homeUrl.trim() && !isHttpUrl(brand.homeUrl)) {
    return "The home page must be a full URL starting with https://.";
  }
  return null;
}

export function normalizeBrand(stored: Record<string, string>, fallbackName: string): Brand {
  const name = stored.brand_name?.trim() || fallbackName.trim() || DEFAULT_BRAND.name;
  const color = HEX.test(stored.brand_color ?? "") ? (stored.brand_color as string).toLowerCase() : DEFAULT_BRAND.color;
  const logoUrl = isHttpUrl(stored.brand_logo_url ?? "") ? (stored.brand_logo_url as string) : "";
  const homeUrl = isHttpUrl(stored.home_url ?? "") ? (stored.home_url as string) : "";
  const showPoweredBy = stored.show_powered_by !== "0";
  return { name: name.slice(0, 40), color, logoUrl, homeUrl, showPoweredBy };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
