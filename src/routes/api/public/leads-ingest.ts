import { createFileRoute } from "@tanstack/react-router";
import { handleIngest } from "@/lib/leads-ingest";

// Integration endpoint for external systems. Requires the shared key in `x-ingest-key`.
export const Route = createFileRoute("/api/public/leads-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LEADS_INGEST_KEY"];
        return handleIngest(request, {
          key,
          getDelaySeconds: async () => {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data } = await supabaseAdmin.from("leads_settings").select("delay_seconds").eq("id", 1).maybeSingle();
            return data?.delay_seconds ?? 0;
          },
          insert: async (row) => {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            return supabaseAdmin.from("leads").insert(row).select("id, status, scheduled_at").single();
          },
        });
      },
    },
  },
});
