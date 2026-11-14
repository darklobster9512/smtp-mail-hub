import { leadInputSchema } from "./leads-schema";

function safeEqual(x: string, y: string) {
  const a = new TextEncoder().encode(x), b = new TextEncoder().encode(y);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export type IngestRow = { email: string; first_name: string | null; last_name: string | null; source: string; status: "scheduled"; scheduled_at: string };
export type IngestDeps = {
  key: string | undefined;
  getDelaySeconds: () => Promise<number>;
  insert: (row: IngestRow) => Promise<{ data: unknown; error: unknown }>;
  now?: () => number;
};

/** Validates key + body; leads from the API are ALWAYS scheduled at now + delay. */
export async function handleIngest(request: Request, deps: IngestDeps): Promise<Response> {
  if (!deps.key || !safeEqual(request.headers.get("x-ingest-key") ?? "", deps.key)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Ungültiges JSON" }, { status: 400 }); }
  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Daten" }, { status: 400 });
  const d = parsed.data;
  const delay = await deps.getDelaySeconds();
  const { data, error } = await deps.insert({
    email: d.email.toLowerCase(), first_name: d.first_name || null, last_name: d.last_name || null, source: d.source || "api",
    status: "scheduled", scheduled_at: new Date((deps.now ?? Date.now)() + delay * 1000).toISOString(),
  });
  if (error) return Response.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  return Response.json(data, { status: 201 });
}
