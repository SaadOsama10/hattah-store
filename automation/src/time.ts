// Istanbul has been fixed at UTC+3 (no DST) since 2016.
const TZ = "Europe/Istanbul";

export function istanbulDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-24" + "12:30" (Istanbul) → UTC Date. */
export function slotToUtc(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+03:00`);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function log(...args: unknown[]) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}
