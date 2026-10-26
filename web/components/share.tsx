"use client";

import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

// Data people ask for (CLABE, RFC…): rows that copy on tap, plus the whole block to copy or send.

function useCopy() {
  const [copied, setCopied] = useState(false);
  // Rejects without permission (or outside https); then there's just no "Copiado".
  const copy = (value: string) =>
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }, console.warn);
  return [copied, copy] as const;
}

// Shown as `display` (grouped or masked); copies the bare `value`.
export function CopyRow({
  label,
  value,
  display = value,
}: {
  label: string;
  value: string;
  display?: string;
}) {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      aria-label={`Copiar ${label}`}
      className="group flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/50"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium break-all tabular-nums">{display}</span>
      </span>
      {copied ? (
        <CheckIcon className="size-4 shrink-0 text-income" />
      ) : (
        <CopyIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      )}
    </button>
  );
}

// "Label: value" lines, skipping empty ones.
export const shareText = (title: string, rows: [string, string | null | undefined][]) =>
  [title, ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join("\n");

const noop = () => () => {};

export function ShareButtons({ text }: { text: string }) {
  const [copied, copy] = useCopy();
  // Phones get the share sheet (WhatsApp…); false on the server, so no hydration mismatch.
  const canShare = useSyncExternalStore(
    noop,
    () => "share" in navigator,
    () => false,
  );
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => copy(text)}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copiado" : "Copiar todo"}
      </Button>
      {canShare && (
        <Button
          type="button"
          size="sm"
          // Closing the sheet without picking anything rejects; nothing to do about it.
          onClick={() => navigator.share({ text }).catch(() => {})}
        >
          <Share2Icon /> Compartir
        </Button>
      )}
    </>
  );
}
