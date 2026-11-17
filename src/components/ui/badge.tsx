import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils.ts";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center gap-1 rounded bg-hover px-1.5 py-0.5 text-xs font-medium text-muted", className)} {...props} />;
}
