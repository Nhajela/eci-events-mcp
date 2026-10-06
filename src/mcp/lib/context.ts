import type { Access } from "@/lib/types";

/** A tool group's section of the edgeos_initialize response, or null when the attendee can't use it. */
export type ContextSection = (access: Access) => string | null;

export function composeSections(access: Access, sections: ContextSection[]): string {
  return sections
    .map((s) => s(access))
    .filter((s): s is string => Boolean(s))
    .join("\n\n");
}
