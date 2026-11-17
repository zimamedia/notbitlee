import { createContext, useContext } from "react";

import type { Brand, PublicConfig } from "@/lib/types.ts";

export type BrandState = PublicConfig & { setBrand: (brand: Brand) => void };

export const BrandContext = createContext<BrandState | null>(null);

export function useBrand(): BrandState {
  const value = useContext(BrandContext);
  if (!value) throw new Error("Brand is missing");
  return value;
}
