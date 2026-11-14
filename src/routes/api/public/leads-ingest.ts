import { createFileRoute } from "@tanstack/react-router";
import { handleIngest } from "@/lib/leads-ingest";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };

// Public lead intake WITHOUT key (owner's explicit choice). Duplicates are skipped, max 100 per call.
// After storing, it starts the sending chain (/api/public/leads-send) in the background — no cron needed.
export const Route = createFileRoute("/api/public/leads-ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const res = await handleIngest(request, {
          ingest: async (leads) => {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data, error } = await supabaseAdmin.rpc("ingest_leads", { _leads: leads });
            return { data: data as never, error };
          },
        });
        if (res.status === 201) {
          const { runInBackground } = await import("@/lib/background.server");
          const origin = new URL(request.url).origin;
          runInBackground(fetch(`${origin}/api/public/leads-send`, { method: "POST" }));
        }
        const out = new Response(res.body, res);
        for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
        return out;
      },
    },
  },
});
