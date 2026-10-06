export const TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

// Newer ICU puts U+202F before AM/PM; models and tests expect a plain space.
const clean = (s: string) => s.replace(/ /g, " ");

export function istDayLabelFromDate(d: Date): string {
  return clean(
    d.toLocaleDateString("en-GB", {
      timeZone: TZ,
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
  ).replace(",", "");
}

export function formatIstTime(iso: string): string {
  return clean(
    new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }),
  );
}

export function formatIst(iso: string): string {
  return `${istDayLabelFromDate(new Date(iso))}, ${formatIstTime(iso)} IST`;
}

export function formatIstRange(startIso: string, endIso: string): string {
  const sameDay = istDate(new Date(startIso)) === istDate(new Date(endIso));
  const end = sameDay
    ? formatIstTime(endIso)
    : `${istDayLabelFromDate(new Date(endIso))}, ${formatIstTime(endIso)}`;
  return `${istDayLabelFromDate(new Date(startIso))}, ${formatIstTime(startIso)} – ${end} IST`;
}

export function istDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function istDayWindow(
  date: string,
  days: number,
): { startAfter: string; startBefore: string } {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d) - IST_OFFSET_MS;
  return {
    startAfter: new Date(start).toISOString(),
    startBefore: new Date(start + days * DAY_MS).toISOString(),
  };
}

export function istHour(iso: string): number {
  return Number(
    new Date(iso).toLocaleString("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }),
  );
}

export function istDayLabel(date: string): string {
  return istDayLabelFromDate(new Date(`${date}T12:00:00+05:30`));
}

export function hasOffset(iso: string): boolean {
  return /(Z|[+-]\d{2}:\d{2})$/.test(iso);
}
