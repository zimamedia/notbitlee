import { Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: title || url });
        return;
      } catch {
        // Closed or not allowed: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void share()} aria-live="polite">
      <Share2 aria-hidden="true" size={15} />
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
