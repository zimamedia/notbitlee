import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";

export function CopyButton({ value, label = "Copy", variant = "outline" }: { value: string; label?: string; variant?: "outline" | "default" }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1600);
  }

  return (
    <Button variant={variant} size="sm" onClick={() => void copy()} aria-live="polite">
      {state === "copied" ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}
