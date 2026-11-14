import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseRecipients } from "./campaign-parse";

const MAX_RECIPIENTS = 20000;
const idSchema = z.object({ campaign_id: z.string().uuid() });

async function assertAdmin(ctx: { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Keine Berechtigung.");
}

export const startCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    idSchema.extend({ recipients_text: z.string().max(2_000_000), account_ids: z.array(z.string().uuid()).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const parsed = parseRecipients(data.recipients_text);
    if (parsed.valid.length === 0) return { ok: false as const, error: "Keine gültigen E-Mail-Adressen." };
    if (parsed.valid.length > MAX_RECIPIENTS) return { ok: false as const, error: `Maximal ${MAX_RECIPIENTS} Empfänger pro Kampagne.` };

    const { data: camp } = await supabase.from("campaigns").select("id, status, subject, html_content").eq("id", data.campaign_id).maybeSingle();
    if (!camp) return { ok: false as const, error: "Kampagne nicht gefunden." };
    if (camp.status !== "draft") return { ok: false as const, error: "Nur Entwürfe können gestartet werden." };
    if (!camp.subject?.trim() || !camp.html_content?.trim()) return { ok: false as const, error: "Betreff und HTML-Inhalt müssen ausgefüllt sein." };

    const { data: accs } = await supabase.from("smtp_accounts").select("id").in("id", data.account_ids).eq("status", "active");
    const ids = (accs ?? []).map((a) => a.id);
    if (ids.length === 0) return { ok: false as const, error: "Kein aktives SMTP-Konto gewählt." };
    // keep the user's order
    const ordered = data.account_ids.filter((i) => ids.includes(i));

    await supabase.from("campaign_recipients").delete().eq("campaign_id", camp.id);
    for (let i = 0; i < parsed.valid.length; i += 500) {
      const chunk = parsed.valid.slice(i, i + 500).map((r) => ({ ...r, campaign_id: camp.id }));
      const { error } = await supabase.from("campaign_recipients").insert(chunk);
      if (error) return { ok: false as const, error: error.message };
    }
    const { error } = await supabase.from("campaigns").update({
      status: "sending", total: parsed.valid.length, sent: 0, failed: 0, started_at: new Date().toISOString(),
      finished_at: null, smtp_account_ids: ordered, rr_index: 0, last_error: null,
    }).eq("id", camp.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, campaign_id: camp.id, total: parsed.valid.length, skipped: parsed.invalid.length + parsed.duplicates };
  });

export const retryFailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { data: camp } = await supabase.from("campaigns").select("id, status").eq("id", data.campaign_id).maybeSingle();
    if (!camp) return { ok: false as const, error: "Kampagne nicht gefunden." };
    if (camp.status === "sending" || camp.status === "draft") return { ok: false as const, error: "Kampagne ist nicht abgeschlossen." };
    await supabase.from("campaign_recipients").update({ status: "pending", error: null, sent_at: null }).eq("campaign_id", camp.id).eq("status", "failed");
    const { count: sent } = await supabase.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", camp.id).eq("status", "sent");
    const { error } = await supabase.from("campaigns").update({ status: "sending", sent: sent ?? 0, failed: 0, finished_at: null, last_error: null }).eq("id", camp.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const abortCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("campaigns").update({ status: "aborted", finished_at: new Date().toISOString() }).eq("id", data.campaign_id).eq("status", "sending");
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const runCampaignTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runTick } = await import("./campaign-sender.server");
    return runTick();
  });
