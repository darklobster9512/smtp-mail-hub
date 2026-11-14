import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fillTemplate } from "./campaign-parse";
import { SmtpConnectError } from "./smtp-transport.server";
import { createMailer, senderEmail, senderName } from "./mail-send.server";
import { ResendError } from "./resend-api";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Acc = {
  id: string; provider: string; host: string | null; port: number; user_email: string | null; password: string | null; api_key: string | null;
  from_name: string | null; from_email: string | null; klick_domain: string | null;
  daily_limit: number; sent_today: number; sent_date: string | null; status: string; label: string | null;
};

export type TickResult = { ran: boolean; reason?: string; sent: number; failed: number };

/** Sends mails for all campaigns in status "sending" until the time budget is used up. Max 1 mail/second. */
export async function runTick(budgetMs = 40000): Promise<TickResult> {
  const { data: got } = await supabaseAdmin.rpc("claim_sender_lock", { _ttl_seconds: 90 });
  if (!got) return { ran: false, reason: "locked", sent: 0, failed: 0 };
  const started = Date.now();
  const result: TickResult = { ran: true, sent: 0, failed: 0 };
  const sender = createMailer();
  const pausedUntil = new Map<string, number>();
  let proxyFailures = 0;
  const badAccounts = new Set<string>();

  try {
    let lastSend = 0;

    while (Date.now() - started < budgetMs) {
      const { data: camp } = await supabaseAdmin.from("campaigns").select("*").eq("status", "sending")
        .order("started_at", { ascending: true }).limit(1).maybeSingle();
      if (!camp) break;

      const { data: accRows } = await supabaseAdmin.from("smtp_accounts").select("*")
        .in("id", camp.smtp_account_ids.length ? camp.smtp_account_ids : ["00000000-0000-0000-0000-000000000000"])
        .eq("status", "active");
      const accounts = (accRows ?? []) as Acc[];
      if (accounts.length === 0) {
        await supabaseAdmin.from("campaigns").update({ status: "failed", last_error: "Kein aktives SMTP-Konto ausgewählt.", finished_at: new Date().toISOString() }).eq("id", camp.id);
        await supabaseAdmin.from("mail_logs").insert({ type: "error", message: `Kampagne „${camp.name}“ abgebrochen: kein aktives SMTP-Konto`, details: { campaign_id: camp.id } });
        continue;
      }
      accounts.sort((a, b) => camp.smtp_account_ids.indexOf(a.id) - camp.smtp_account_ids.indexOf(b.id));
      for (const a of accounts) if (a.sent_date !== today()) { a.sent_today = 0; a.sent_date = today(); }

      const { data: batch } = await supabaseAdmin.from("campaign_recipients").select("*")
        .eq("campaign_id", camp.id).eq("status", "pending").order("created_at", { ascending: true }).order("id").limit(20);

      if (!batch || batch.length === 0) {
        const [{ count: sent }, { count: failed }] = await Promise.all([
          supabaseAdmin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", camp.id).eq("status", "sent"),
          supabaseAdmin.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", camp.id).eq("status", "failed"),
        ]);
        const status = (sent ?? 0) === 0 && (failed ?? 0) > 0 ? "failed" : "done";
        await supabaseAdmin.from("campaigns").update({ status, sent: sent ?? 0, failed: failed ?? 0, finished_at: new Date().toISOString(), last_error: null }).eq("id", camp.id);
        await supabaseAdmin.from("mail_logs").insert({ type: "info", message: `Kampagne „${camp.name}“ beendet (${sent ?? 0} gesendet, ${failed ?? 0} fehlgeschlagen)`, details: { campaign_id: camp.id } });
        continue;
      }

      let rr = camp.rr_index;
      let sentInCamp = camp.sent;
      let failedInCamp = camp.failed;
      let stop = false;

      for (const rec of batch) {
        if (Date.now() - started >= budgetMs) { stop = true; break; }
        // pick next account in rotation that is usable and below its daily limit
        let acc: Acc | null = null;
        for (let k = 0; k < accounts.length; k++) {
          const cand = accounts[(rr + k) % accounts.length]!;
          if (!badAccounts.has(cand.id) && (pausedUntil.get(cand.id) ?? 0) <= Date.now() && cand.sent_today < cand.daily_limit) { acc = cand; rr = (rr + k + 1) % accounts.length; break; }
        }
        if (!acc) {
          const allBad = accounts.every((a) => badAccounts.has(a.id) || (pausedUntil.get(a.id) ?? 0) > Date.now());
          await supabaseAdmin.from("campaigns").update({
            rr_index: rr, sent: sentInCamp, failed: failedInCamp,
            last_error: allBad ? "Keine Konten verfügbar (Verbindung/Ratenlimit) – wird erneut versucht." : "Alle Konten haben das Tageslimit erreicht – Versand pausiert.",
          }).eq("id", camp.id);
          stop = true;
          break;
        }

        const wait = 1000 - (Date.now() - lastSend);
        if (wait > 0) await sleep(wait);
        lastSend = Date.now();

        const vars = { klick_domain: acc.klick_domain, first_name: rec.first_name, last_name: rec.last_name, anrede: rec.anrede };
        try {
          await sender.send(acc, {
            from: { name: senderName(acc), email: senderEmail(acc) },
            to: { email: rec.email },
            subject: fillTemplate(camp.subject ?? "", vars, { html: false }),
            html: fillTemplate(camp.html_content ?? "", vars, { html: true }),
          });
          acc.sent_today++;
          sentInCamp++; result.sent++;
          await supabaseAdmin.from("campaign_recipients").update({ status: "sent", sent_at: new Date().toISOString(), smtp_account_used: acc.id, error: null }).eq("id", rec.id);
          await supabaseAdmin.from("smtp_accounts").update({ sent_today: acc.sent_today, sent_date: today() }).eq("id", acc.id);
        } catch (e) {
          const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
          const accName = acc.label || acc.host || "Resend";
          if (e instanceof ResendError && e.kind === "auth") {
            badAccounts.add(acc.id);
            await supabaseAdmin.from("smtp_accounts").update({ status: "blocked" }).eq("id", acc.id);
            await supabaseAdmin.from("mail_logs").insert({ type: "error", message: `Konto ${accName} blockiert: API-Key ungültig`, details: { account_id: acc.id, error: msg } });
            continue;
          }
          if (e instanceof ResendError && e.kind === "rate") {
            pausedUntil.set(acc.id, Date.now() + 60000);
            await supabaseAdmin.from("mail_logs").insert({ type: "warning", message: `Konto ${accName}: Ratenlimit, 60 s Pause`, details: { account_id: acc.id } });
            continue;
          }
          if (e instanceof SmtpConnectError) {
            // recipient stays pending; the connection (not the recipient) is the problem
            if (e.proxyFailure) {
              proxyFailures++;
              await supabaseAdmin.from("mail_logs").insert({ type: "error", message: "Proxy-Verbindung fehlgeschlagen", details: { account_id: acc.id, error: msg } });
              await supabaseAdmin.from("campaigns").update({ last_error: `Proxy-Verbindung fehlgeschlagen: ${msg}`.slice(0, 500), rr_index: rr, sent: sentInCamp, failed: failedInCamp }).eq("id", camp.id);
              if (proxyFailures >= 3) { stop = true; break; }
            } else {
              badAccounts.add(acc.id);
              await supabaseAdmin.from("mail_logs").insert({ type: "error", message: `Verbindung zu ${accName} fehlgeschlagen`, details: { account_id: acc.id, error: msg } });
              await supabaseAdmin.from("campaigns").update({ last_error: `Verbindung zu ${accName} fehlgeschlagen: ${msg}` }).eq("id", camp.id);
            }
            continue;
          }
          failedInCamp++; result.failed++;
          await supabaseAdmin.from("campaign_recipients").update({ status: "failed", error: msg, smtp_account_used: acc.id, sent_at: new Date().toISOString() }).eq("id", rec.id);
        }
        await supabaseAdmin.from("campaigns").update({ sent: sentInCamp, failed: failedInCamp, rr_index: rr, last_error: null }).eq("id", camp.id);
      }
      if (stop) break;
    }
  } finally {
    await sender.closeAll();
    await supabaseAdmin.rpc("release_sender_lock");
  }
  return result;
}
