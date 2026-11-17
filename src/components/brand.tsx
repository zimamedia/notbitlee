import { useEffect, useState, type ReactNode } from "react";

import { BrandContext } from "@/components/brand-context.ts";
import { api } from "@/lib/api.ts";
import { applyBrand } from "@/lib/apply-brand.ts";
import type { Brand, PublicConfig } from "@/lib/types.ts";

export function BrandProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<PublicConfig>("/api/public")
      .then((next) => {
        if (!cancelled) setConfig(next);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the app.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (config) applyBrand(config.brand);
  }, [config]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center" role="alert">
        <div>
          <p className="font-semibold">The dashboard could not start.</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <p className="mt-1 text-sm text-muted">If you just deployed, check that the database migrations ran.</p>
        </div>
      </div>
    );
  }
  if (!config) return <div className="min-h-screen" aria-busy="true" />;

  const setBrand = (brand: Brand) => setConfig({ ...config, brand });
  return <BrandContext.Provider value={{ ...config, setBrand }}>{children}</BrandContext.Provider>;
}

export function BrandMark({ brand, size = "md" }: { brand: Brand; size?: "md" | "lg" }) {
  const height = size === "lg" ? "h-10" : "h-8";
  if (brand.logoUrl) {
    return <img src={brand.logoUrl} alt={brand.name} className={`${height} w-auto max-w-44 object-contain`} />;
  }
  return (
    <span className="flex items-center gap-2">
      <span className={`${height} grid aspect-square place-items-center rounded-lg bg-brand text-sm font-bold text-on-brand`} aria-hidden="true">
        {brand.name.slice(0, 1).toUpperCase()}
      </span>
      <span className={`${size === "lg" ? "text-xl" : "text-lg"} font-bold tracking-tight text-ink`}>{brand.name}</span>
    </span>
  );
}
