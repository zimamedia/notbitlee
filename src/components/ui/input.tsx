import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils.ts";

const field =
  "w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-faint focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-20 py-2", className)} {...props} />;
}
