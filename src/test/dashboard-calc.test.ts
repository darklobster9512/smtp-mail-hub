import { describe, expect, it } from "vitest";
import { groupByDay, successRate } from "@/lib/dashboard-calc";

describe("groupByDay", () => {
  const now = new Date("2026-11-14T10:00:00Z");
  it("liefert 14 Tage, Lücken = 0", () => {
    const r = groupByDay(["2026-11-14T08:00:00Z", "2026-11-14T09:00:00Z", "2026-11-10T12:00:00Z", "2026-10-01T12:00:00Z"], now);
    expect(r).toHaveLength(14);
    expect(r[13]).toEqual({ date: "2026-11-14", count: 2 });
    expect(r.find((d) => d.date === "2026-11-10")!.count).toBe(1);
    expect(r.find((d) => d.date === "2026-11-11")!.count).toBe(0);
  });
});
describe("successRate", () => {
  it("rechnet Prozent", () => expect(successRate(90, 10)).toBe(90));
  it("ohne Mails null", () => expect(successRate(0, 0)).toBeNull());
});
