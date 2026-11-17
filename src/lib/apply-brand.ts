import { textOn } from "@/lib/color.ts";
import type { Brand } from "@/lib/types.ts";

export function applyBrand(brand: Brand) {
  const root = document.documentElement;
  root.style.setProperty("--color-brand", brand.color);
  root.style.setProperty("--color-on-brand", textOn(brand.color));
  document.title = brand.name;
  const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (icon) icon.href = brand.logoUrl || "/favicon.svg";
}

