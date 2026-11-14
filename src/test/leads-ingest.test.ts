import { describe, expect, it } from "vitest";
import { handleIngest, type IngestDeps } from "@/lib/leads-ingest";
import type { LeadInput } from "@/lib/leads-schema";

const req = (body: unknown) => new Request("http://x/api/public/leads-ingest", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const ok = (seen: LeadInput[][] = []): IngestDeps => ({ ingest: async (l) => { seen.push(l); return { data: { accepted: l.length, duplicates: 0, scheduled_at: "t" }, error: null }; } });

describe("leads-ingest (öffentlich, ohne Key)", () => {
  it("ohne Key → 201", async () => expect((await handleIngest(req({ email: "a@b.de" }), ok())).status).toBe(201));
  it("mehrere Leads über { leads: [...] }", async () => {
    const seen: LeadInput[][] = [];
    await handleIngest(req({ leads: [{ email: "a@b.de" }, { email: "c@d.de", first_name: "Cora" }] }), ok(seen));
    expect(seen[0]).toHaveLength(2);
  });
  it("mehr als 100 Leads → 413", async () => {
    const r = await handleIngest(req(Array.from({ length: 101 }, (_, i) => ({ email: `x${i}@b.de` }))), ok());
    expect(r.status).toBe(413);
  });
  it("ungültige E-Mail → 400", async () => expect((await handleIngest(req({ email: "nope" }), ok())).status).toBe(400));
  it("ungültiges JSON → 400", async () => expect((await handleIngest(req("{"), ok())).status).toBe(400));
  it("nur Duplikate → duplicate: true", async () => {
    const r = await handleIngest(req({ email: "a@b.de" }), { ingest: async () => ({ data: { accepted: 0, duplicates: 1, scheduled_at: null }, error: null }) });
    expect((await r.json()).duplicate).toBe(true);
  });
});
