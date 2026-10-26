"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

export function CodeBlock({ code, title, className = "" }: { code: string; title?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div className={`card overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-fog">
          <span>{title}</span>
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto px-4 py-4 pr-14 text-[13.5px] leading-relaxed text-mist">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy to clipboard"
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-ink text-fog hover:text-paper active:scale-[0.96]"
        >
          {copied ? <Check size={18} weight="bold" className="text-lime" /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  );
}
