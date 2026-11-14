import { createServerFn } from "@tanstack/react-start";
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

export const runLeadsTickFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runLeadsTick } = await import("./leads-sender.server");
    return runLeadsTick(20000);
  });
