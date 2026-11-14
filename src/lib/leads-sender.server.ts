import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fillTemplate } from "./campaign-parse";
import { buildAnrede } from "./anrede";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
type Mailer = { send: (m: unknown) => Promise<unknown>; close: () => Promise<unknown> };

export type LeadsTickResult = { ran: boolean; reason?: string; sent: number; failed: number };

/** Sends due leads (status scheduled, scheduled_at <= now) respecting min_gap_seconds. Random account per lead. */
export async function runLeadsTick(budgetMs = 15000): Promise<LeadsTickResult> {
  const { data: got } = await supabaseAdmin.rpc("claim_sender_lock", { _ttl_seconds: 90 });
  if (!got) return { ran: false, reason: "locked", sent: 0, failed: 0 };
  const started = Date.now();
  const res: LeadsTickResult = { ran: true, sent: 0, failed: 0 };
  const mailers = new Map<string, Mailer>();
  try {
    const { WorkerMailer } = await import("worker-mailer");
    while (Date.now() - started < budgetMs) {
      const { data: s } = await supabaseAdmin.from("leads_settings").select("*").eq("id", 1).maybeSingle();
      if (!s) { res.reason = "no-settings"; break; }
      if (!s.auto_campaign_enabled) { res.reason = "disabled"; break; }
      const gapMs = s.min_gap_seconds * 1000;
      const last = s.last_auto_sent_at ? new Date(s.last_auto_sent_at).getTime() : 0;
      const waitMs = last + gapMs - Date.now();
      if (waitMs > 0) {
        if (Date.now() - started + waitMs > budgetMs) { res.reason = "gap"; break; }
        await new Promise((r) => setTimeout(r, waitMs));
      }

      const { data: lead } = await supabaseAdmin.from("leads").select("*").eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1).maybeSingle();
      if (!lead) break;

      const fail = async (msg: string, accId: string | null = null) => {
        res.failed++;
        await supabaseAdmin.from("leads").update({ status: "failed", error: msg.slice(0, 500), smtp_account_used: accId, sent_at: new Date().toISOString() }).eq("id", lead.id);
        await supabaseAdmin.from("mail_logs").insert({ type: "error", message: `Lead ${lead.email}: ${msg.slice(0, 200)}`, details: { lead_id: lead.id } });
      };

      const tpl = s.template_key
        ? (await supabaseAdmin.from("campaigns").select("id, subject, html_content").eq("id", s.template_key).maybeSingle()).data
        : null;
      if (!tpl) { await fail("Keine Auto-Vorlage gewählt."); continue; }

      const { data: accRows } = await supabaseAdmin.from("smtp_accounts").select("*").eq("status", "active");
      const accounts = (accRows ?? []).map((a) => (a.sent_date !== today() ? { ...a, sent_today: 0 } : a)).filter((a) => a.sent_today < a.daily_limit);
      if (accounts.length === 0) { res.reason = "no-account"; break; } // leave scheduled, retry later
      const acc = accounts[Math.floor(Math.random() * accounts.length)]!;

      const vars = { klick_domain: acc.klick_domain, first_name: lead.first_name, last_name: lead.last_name, anrede: buildAnrede(lead.first_name, lead.last_name) };
      await supabaseAdmin.from("leads_settings").update({ last_auto_sent_at: new Date().toISOString() }).eq("id", 1);
      try {
        let mailer = mailers.get(acc.id);
        if (!mailer) {
          mailer = (await WorkerMailer.connect({
            host: acc.host, port: acc.port, secure: acc.port === 465, startTls: acc.port !== 465,
            credentials: { username: acc.user_email, password: acc.password ?? "" }, authType: ["plain", "login"],
          })) as unknown as Mailer;
          mailers.set(acc.id, mailer);
        }
        await mailer.send({
          from: { name: acc.from_name || acc.label || acc.host, email: acc.from_email || acc.user_email },
          to: { email: lead.email },
          subject: fillTemplate(tpl.subject ?? "", vars, { html: false }),
          html: fillTemplate(tpl.html_content ?? "", vars, { html: true }),
        });
        res.sent++;
        await supabaseAdmin.from("leads").update({ status: "sent", sent_at: new Date().toISOString(), smtp_account_used: acc.id, campaign_id: tpl.id, error: null }).eq("id", lead.id);
        await supabaseAdmin.from("smtp_accounts").update({ sent_today: acc.sent_today + 1, sent_date: today() }).eq("id", acc.id);
      } catch (e) {
        const m = mailers.get(acc.id); mailers.delete(acc.id);
        try { await m?.close(); } catch { /* ignore */ }
        await fail(e instanceof Error ? e.message : String(e), acc.id);
      }
    }
  } finally {
    for (const m of mailers.values()) { try { await m.close(); } catch { /* ignore */ } }
    await supabaseAdmin.rpc("release_sender_lock");
  }
  return res;
}
