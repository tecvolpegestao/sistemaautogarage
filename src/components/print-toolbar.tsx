"use client";

import { toJpeg } from "html-to-image";
import { useState } from "react";

export function PrintToolbar({ text, filename }: { text: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const node = document.getElementById("documento");
    if (!node) return;
    setError(null);
    try {
      const url = await toJpeg(node, { quality: 0.95, backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
    } catch {
      setError("Não foi possível gerar o JPEG. Use Imprimir / PDF.");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => window.print()} className="h-10 rounded-md bg-[#FDC307] px-4 text-sm font-semibold text-[#0A0A0A]">
        Imprimir / PDF
      </button>
      <button type="button" onClick={download} className="h-10 rounded-md border border-[#0A0A0A] px-4 text-sm font-semibold">
        Baixar JPEG
      </button>
      <button type="button" onClick={copy} className="h-10 rounded-md border border-[#0A0A0A] px-4 text-sm font-semibold">
        {copied ? "Resumo copiado" : "Copiar para WhatsApp"}
      </button>
      {error ? <span className="text-sm text-[#C5343A]">{error}</span> : null}
    </div>
  );
}
