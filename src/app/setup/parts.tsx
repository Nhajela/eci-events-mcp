// Small shared pieces for the setup guide.

import Image from "next/image";
import { CopyButton } from "@/components/copy-button";

export const GOAL =
  "can talk to Edge City's events system (EdgeOS): find events, see what's on, and RSVP for you after you say yes.";

/** The one-line end goal, repeated on the page and on every tutorial slide. */
export function GoalLine({ who = "your Claude or ChatGPT" }: { who?: string }) {
  return (
    <p className="rounded-lg bg-teal-50 px-4 py-2 text-teal-900">
      <b>The goal:</b> {who} {GOAL}
    </p>
  );
}

export function CopyBox({ label, value }: { label?: string; value: string }) {
  return (
    <div className="min-w-0">
      {label && <p className="mb-1 text-sm font-medium text-neutral-700">{label}</p>}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-300 bg-neutral-50 p-3">
        <code className="min-w-0 flex-1 break-all font-mono text-sm">{value}</code>
        <CopyButton value={value} label="Copy" />
      </div>
    </div>
  );
}

export function Shot({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="h-auto w-full max-w-xl rounded-lg border border-neutral-300 bg-neutral-900"
    />
  );
}

export function Never() {
  return (
    <p className="rounded-lg bg-amber-50 px-4 py-2 font-medium text-amber-900">
      Never paste your key into a chat. Only into the page that opens from this site.
    </p>
  );
}
