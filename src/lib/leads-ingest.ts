import { leadInputSchema, type LeadInput } from "./leads-schema";

export const MAX_LEADS_PER_CALL = 100;

export type IngestResult = { accepted: number; duplicates: number; scheduled_at: string | null };
export type IngestDeps = { ingest: (leads: LeadInput[]) => Promise<{ data: IngestResult | null; error: unknown }> };

/** Public, keyless intake. Accepts one lead object, an array, or { leads: [...] } (max 100). */
export async function handleIngest(request: Request, deps: IngestDeps): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Ungültiges JSON" }, { status: 400 }); }
  const raw: unknown[] = Array.isArray(body) ? body
    : body && typeof body === "object" && Array.isArray((body as { leads?: unknown }).leads) ? (body as { leads: unknown[] }).leads
    : [body];
  if (raw.length === 0) return Response.json({ error: "Keine Leads übergeben" }, { status: 400 });
  if (raw.length > MAX_LEADS_PER_CALL) return Response.json({ error: `Höchstens ${MAX_LEADS_PER_CALL} Leads pro Aufruf` }, { status: 413 });
  const leads: LeadInput[] = [];
  for (let i = 0; i < raw.length; i++) {
    const p = leadInputSchema.safeParse(raw[i]);
    if (!p.success) return Response.json({ error: `${p.error.issues[0]?.message ?? "Ungültige Daten"}${raw.length > 1 ? ` (Eintrag ${i + 1})` : ""}` }, { status: 400 });
    leads.push(p.data);
  }
  const { data, error } = await deps.ingest(leads);
  if (error || !data) return Response.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  return Response.json({ ...data, duplicate: data.accepted === 0 && data.duplicates > 0 }, { status: 201 });
}
