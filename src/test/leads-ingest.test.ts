import { describe, expect, it } from "vitest";
import { handleIngest, type IngestRow } from "@/lib/leads-ingest";

const req = (body: unknown, key?: string) => new Request("http://x/api/public/leads-ingest", {
  method: "POST", body: JSON.stringify(body), headers: key ? { "x-ingest-key": key } : {},
});

describe("leads-ingest", () => {
  it("ohne Schlüssel → 401", async () => {
    const r = await handleIngest(req({ email: "a@b.de" }), { key: "k", getDelaySeconds: async () => 30, insert: async () => ({ data: {}, error: null }) });
    expect(r.status).toBe(401);
  });
  it("gültiger Lead → scheduled, jetzt + Verzögerung", async () => {
    let row: IngestRow | null = null;
    const r = await handleIngest(req({ email: "A@b.de", first_name: "Max" }, "k"), {
      key: "k", getDelaySeconds: async () => 30, now: () => 1_000_000,
      insert: async (x) => { row = x; return { data: { id: 1 }, error: null }; },
    });
    expect(r.status).toBe(201);
    expect(row!.status).toBe("scheduled");
    expect(row!.scheduled_at).toBe(new Date(1_030_000).toISOString());
    expect(row!.email).toBe("a@b.de");
  });
});
