export const berlinDay = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

/** Groups timestamps into the last `days` Berlin calendar days (oldest first), missing days = 0. */
export function groupByDay(timestamps: (string | null)[], now = new Date(), days = 14) {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) keys.push(berlinDay(new Date(now.getTime() - i * 86400e3)));
  const map = new Map(keys.map((k) => [k, 0]));
  for (const t of timestamps) {
    if (!t) continue;
    const k = berlinDay(new Date(t));
    if (map.has(k)) map.set(k, map.get(k)! + 1);
  }
  return keys.map((date) => ({ date, count: map.get(date)! }));
}

export function successRate(sent: number, failed: number): number | null {
  const t = sent + failed;
  return t === 0 ? null : Math.round((sent / t) * 1000) / 10;
}
