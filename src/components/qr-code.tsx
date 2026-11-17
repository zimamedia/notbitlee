import { Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button.tsx";

export function QrCode({ value, fileName, color = "#111827" }: { value: string; fileName: string; color?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [dark, setDark] = useState(true);
  const foreground = dark ? "#111827" : color;

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: foreground, light: "#ffffff" } })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, foreground]);

  async function downloadPng() {
    const url = await QRCode.toDataURL(value, { width: 1024, margin: 2, errorCorrectionLevel: "M", color: { dark: foreground, light: "#ffffff" } });
    save(url, `${fileName}.png`);
  }

  function downloadSvg() {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    save(url, `${fileName}.svg`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div>
      <div className="mx-auto aspect-square w-full max-w-48 rounded-md border border-line bg-white p-2">
        {svg ? <div className="size-full [&>svg]:size-full" role="img" aria-label={`QR code for ${value}`} dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-xs">
        <span className="text-muted">Colour</span>
        <button type="button" aria-pressed={dark} onClick={() => setDark(true)} className={`size-5 rounded-full bg-[#111827] ring-offset-2 ${dark ? "ring-2 ring-brand" : ""}`} aria-label="Black" />
        <button type="button" aria-pressed={!dark} onClick={() => setDark(false)} className={`size-5 rounded-full ring-offset-2 ${!dark ? "ring-2 ring-brand" : ""}`} style={{ background: color }} aria-label="Brand colour" />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void downloadPng()}>
          <Download aria-hidden="true" size={15} />
          PNG
        </Button>
        <Button variant="outline" size="sm" onClick={downloadSvg} disabled={!svg}>
          <Download aria-hidden="true" size={15} />
          SVG
        </Button>
      </div>
    </div>
  );
}

function save(href: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.click();
}
