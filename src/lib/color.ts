/** Black or white, whichever reads better on the given hex colour (WCAG relative luminance). */
export function textOn(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) return "#ffffff";
  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
  return luminance > 0.4 ? "#111827" : "#ffffff";
}
