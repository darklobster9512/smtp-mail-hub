import { createFileRoute } from "@tanstack/react-router";

const HORIZON_MS = 15 * 60 * 1000; // follow leads due within 15 minutes
const MAX_WAIT_MS = 15_000; // per hop; every hop is a fresh request

// Public on purpose: takes no input and only sends leads that are already scheduled and due
// (delay, min gap, daily limits and the global sender lock still apply). Each call waits briefly for the
// next due lead, sends, and hands over to the next call while scheduled leads remain — a timer without cron.
export const Route = createFileRoute("/api/public/leads-send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nextDue = async () => {
          const { data: s } = await supabaseAdmin.from("leads_settings").select("auto_campaign_enabled").eq("id", 1).maybeSingle();
          if (!s?.auto_campaign_enabled) return null;
          const { data } = await supabaseAdmin.from("leads").select("scheduled_at").eq("status", "scheduled")
            .order("scheduled_at").limit(1).maybeSingle();
          if (!data?.scheduled_at) return null;
          const ms = new Date(data.scheduled_at).getTime() - Date.now();
          return ms > HORIZON_MS ? null : ms;
        };

        const wait = await nextDue();
        if (wait === null) return Response.json({ ran: false, reason: "idle" });
        if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, MAX_WAIT_MS)));

        const { runLeadsTick } = await import("@/lib/leads-sender.server");
        const r = await runLeadsTick(8000);

        if ((await nextDue()) !== null) {
          const { runInBackground } = await import("@/lib/background.server");
          runInBackground(fetch(`${new URL(request.url).origin}/api/public/leads-send`, { method: "POST" }));
        }
        return Response.json({ ran: r.ran, sent: r.sent, failed: r.failed, reason: r.reason ?? null });
      },
    },
  },
});
