import { createFileRoute } from "@tanstack/react-router";
import { leadInputSchema } from "@/lib/leads-schema";

function safeEqual(x: string, y: string) {
  const a = new TextEncoder().encode(x), b = new TextEncoder().encode(y);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

// Integration endpoint for external systems. Requires the shared key in `x-ingest-key`.
export const Route = createFileRoute("/api/public/leads-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LEADS_INGEST_KEY"];
        if (!key || !safeEqual(request.headers.get("x-ingest-key") ?? "", key)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "Ungültiges JSON" }, { status: 400 }); }
        const parsed = leadInputSchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Daten" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: s } = await supabaseAdmin.from("leads_settings").select("delay_seconds, auto_campaign_enabled").eq("id", 1).maybeSingle();
        const auto = s?.auto_campaign_enabled ?? false;
        const d = parsed.data;
        const { data: row, error } = await supabaseAdmin.from("leads").insert({
          email: d.email.toLowerCase(), first_name: d.first_name || null, last_name: d.last_name || null, source: d.source || "api",
          status: auto ? "scheduled" : "new",
          scheduled_at: auto ? new Date(Date.now() + (s?.delay_seconds ?? 0) * 1000).toISOString() : null,
        }).select("id, status, scheduled_at").single();
        if (error) return Response.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
        return Response.json(row, { status: 201 });
      },
    },
  },
});
