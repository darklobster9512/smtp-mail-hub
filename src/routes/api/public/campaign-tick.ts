import { createFileRoute } from "@tanstack/react-router";

// Called by an external scheduler (e.g. every minute). Requires the shared secret in `x-cron-secret`.
export const Route = createFileRoute("/api/public/campaign-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const given = request.headers.get("x-cron-secret") ?? "";
        const enc = new TextEncoder();
        const a = enc.encode(given);
        const b = enc.encode(secret ?? "");
        let diff = a.length ^ b.length;
        for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
        if (!secret || diff !== 0) return new Response("Unauthorized", { status: 401 });
        const { runTick } = await import("@/lib/campaign-sender.server");
        const res = await runTick();
        const { runLeadsTick } = await import("@/lib/leads-sender.server");
        const leads = await runLeadsTick(15000);
        return Response.json({ ...res, leads });
      },
    },
  },
});
