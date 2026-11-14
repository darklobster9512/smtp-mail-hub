import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { leadInputSchema } from "./leads-schema";

async function assertAdmin(ctx: { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Keine Berechtigung.");
}

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => leadInputSchema.extend({ auto: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { data: s } = await supabase.from("leads_settings").select("delay_seconds").eq("id", 1).maybeSingle();
    const { error } = await supabase.from("leads").insert({
      email: data.email.toLowerCase(), first_name: data.first_name || null, last_name: data.last_name || null, source: data.source || "manuell",
      status: data.auto ? "scheduled" : "new",
      scheduled_at: data.auto ? new Date(Date.now() + (s?.delay_seconds ?? 0) * 1000).toISOString() : null,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const sendDueLeadsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runLeadsTick } = await import("./leads-sender.server");
    return runLeadsTick(40000);
  });

/** One background step for campaigns + leads; called every minute while the admin panel is open. */
export const runBackgroundTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runTick } = await import("./campaign-sender.server");
    const { runLeadsTick } = await import("./leads-sender.server");
    const campaigns = await runTick(25000);
    const leads = await runLeadsTick(15000);
    return { campaigns, leads };
  });

export const getSecretStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return { LEADS_INGEST_KEY: Boolean(process.env["LEADS_INGEST_KEY"]), CRON_SECRET: Boolean(process.env["CRON_SECRET"]) };
  });

export const testIngest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const key = process.env["LEADS_INGEST_KEY"];
    const origin = new URL(getRequest().url).origin;
    const url = `${origin}/api/public/leads-ingest`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ingest-key": key ?? "" },
        body: JSON.stringify({ email: "integration-test@example.com", first_name: "Integration", last_name: "Test", source: "integration-test" }),
      });
      const text = (await r.text()).slice(0, 300);
      if (r.status === 201) {
        try {
          const id = (JSON.parse(text) as { id?: string }).id;
          if (id) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("leads").delete().eq("id", id);
          }
        } catch { /* ignore */ }
      }
      return { status: r.status, body: text, url, keySet: Boolean(key) };
    } catch (e) {
      return { status: 0, body: e instanceof Error ? e.message : String(e), url, keySet: Boolean(key) };
    }
  });
