"use client";

import { useState } from "react";

function copyViaExecCommand(text: string): void {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

/**
 * Falls back to the older synchronous `execCommand` path not just when the
 * async Clipboard API is absent, but whenever it rejects — e.g. Chrome's
 * "Document is not focused" DOMException, which is easy to hit in embedded
 * or automated contexts and isn't a case worth surfacing as a failure to a
 * reader who just clicked a visible button in their own browser.
 */
async function copy(text: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
  } catch {
    copyViaExecCommand(text);
  }
}

export function CopyButton({
  text,
  label,
  absolute = false,
}: {
  text: string;
  label: string;
  /** Prepend `window.location.origin` at copy time — for a shareable link path. */
  absolute?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const full = absolute ? `${window.location.origin}${text}` : text;
        await copy(full);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f5a52] hover:text-[#d9362b]"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
