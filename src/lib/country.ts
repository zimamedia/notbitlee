const regionNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(undefined, { type: "region" }) : null;

export function countryName(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

