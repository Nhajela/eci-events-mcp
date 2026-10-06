import { describe, expect, it } from "vitest";
import {
  cleanSpaces,
  formatIst,
  formatIstRange,
  hasOffset,
  istDate,
  istDayLabel,
  istDayWindow,
  istHour,
} from "@/lib/time";

describe("IST time", () => {
  it("formats UTC as IST", () => {
    expect(formatIst("2026-10-14T15:00:00Z")).toBe("Wed 14 Oct, 8:30 PM IST");
  });
  it("formats a range", () => {
    expect(formatIstRange("2026-10-14T15:00:00Z", "2026-10-14T16:00:00Z")).toBe(
      "Wed 14 Oct, 8:30 PM – 9:30 PM IST",
    );
  });
  it("gives the IST calendar date, not the UTC one", () => {
    expect(istDate(new Date("2026-10-13T20:00:00Z"))).toBe("2026-10-14");
  });
  it("converts an IST day to a UTC window", () => {
    expect(istDayWindow("2026-10-14", 1)).toEqual({
      startAfter: "2026-10-13T18:30:00.000Z",
      startBefore: "2026-10-14T18:30:00.000Z",
    });
    expect(istDayWindow("2026-10-14", 7).startBefore).toBe("2026-10-20T18:30:00.000Z");
  });
  it("reads the IST hour", () => {
    expect(istHour("2026-10-14T21:00:00Z")).toBe(2);
  });
  it("labels a day", () => {
    expect(istDayLabel("2026-10-14")).toBe("Wed 14 Oct");
  });
  it("detects offsets", () => {
    expect(hasOffset("2026-10-14T18:00:00+05:30")).toBe(true);
    expect(hasOffset("2026-10-14T12:30:00Z")).toBe(true);
    expect(hasOffset("2026-10-14T18:00:00")).toBe(false);
  });
  it("normalizes spaces in time strings", () => {
    const NARROW = String.fromCharCode(0x202f);
    const NB = String.fromCharCode(0x00a0);
    expect(cleanSpaces(`8:30${NARROW}PM`)).toBe("8:30 PM");
    expect(cleanSpaces(`8:30${NB}PM`)).toBe("8:30 PM");
  });
  it("formatIst output contains no U+202F", () => {
    const NARROW = String.fromCharCode(0x202f);
    const formatted = formatIst("2026-10-14T15:00:00Z");
    expect(formatted.includes(NARROW)).toBe(false);
  });
});
