import { describe, expect, it } from "vitest";
import { guideFor } from "@/mcp/guide";

const rows = (t: string) => [...t.matchAll(/^\| ([a-z_]+)( \*)? \|/gm)].map((m) => m[1]);

describe("guide reference tables", () => {
  it("hosting lists only fields create_event and update_event accept", () => {
    const t = guideFor("hosting");
    const names = rows(t);
    expect(names).toContain("title");
    expect(names).toContain("start_time");
    for (const f of ["recurrence", "cover_url", "popup_id", "host_id", "highlighted", "status"])
      expect(names).not.toContain(f);
    expect(t).toContain(
      "Other EdgeOS fields (e.g. recurrence, cover image) can't be set through this server; use the Edge City portal.",
    );
  });

  it("venues lists only fields create_venue and update_venue accept", () => {
    const t = guideFor("venues");
    const names = rows(t);
    expect(names).toContain("capacity");
    for (const f of ["image_url", "geo_lat", "booking_mode", "display_order"])
      expect(names).not.toContain(f);
    expect(t).toContain("can't be set through this server; use the Edge City portal.");
  });
});
