import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fillTemplate } from "./campaign-parse";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Acc = {
  id: string; host: string; port: number; user_email: string; password: string | null;
  from_name: string | null; from_email: string | null; klick_domain: string | null;
  daily_limit: number; sent_today: number; sent_date: string | null; status: string; label: string | null;
};
type Mailer = { send: (m: unknown) => Promise<unknown>; close: () => Promise<unknown> };

export type TickResult = { ran: boolean; reason?: string; sent: number; failed: number };

/** Sends mails for all campaigns in status "sending" until the time budget is used up. Max 1 mail/second. */
export async function runTick(budgetMs = 40000): Promise<TickResult> {
  const { data: got } = await supabaseAdmin.rpc("claim_sender_lock", { _ttl_seconds: 90 });
  if (!got) return { ran: false, reason: "locked", sent: 0, failed: 0 };
  const started = Date.now();
  const result: TickResult = { ran: true, sent: 0, failed: 0 };
  const mailers = new Map<string, Mailer>();
  const badAccounts = new Set<string>();

  try {
    const { WorkerMailer } = await import("worker-mailer");
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
          if (!badAccounts.has(cand.id) && cand.sent_today < cand.daily_limit) { acc = cand; rr = (rr + k + 1) % accounts.length; break; }
        }
        if (!acc) {
          const allBad = accounts.every((a) => badAccounts.has(a.id));
          await supabaseAdmin.from("campaigns").update({
            rr_index: rr, sent: sentInCamp, failed: failedInCamp,
            last_error: allBad ? "Keine Verbindung zu den SMTP-Konten – wird erneut versucht." : "Alle Konten haben das Tageslimit erreicht – Versand pausiert.",
          }).eq("id", camp.id);
          stop = true;
          break;
        }

        let mailer = mailers.get(acc.id);
        if (!mailer) {
          try {
            mailer = (await WorkerMailer.connect({
              host: acc.host, port: acc.port, secure: acc.port === 465, startTls: acc.port !== 465,
              credentials: { username: acc.user_email, password: acc.password ?? "" }, authType: ["plain", "login"],
            })) as unknown as Mailer;
            mailers.set(acc.id, mailer);
          } catch (e) {
            badAccounts.add(acc.id);
            const msg = e instanceof Error ? e.message : String(e);
            await supabaseAdmin.from("mail_logs").insert({ type: "error", message: `Verbindung zu ${acc.label || acc.host} fehlgeschlagen`, details: { account_id: acc.id, error: msg } });
            await supabaseAdmin.from("campaigns").update({ last_error: `Verbindung zu ${acc.label || acc.host} fehlgeschlagen: ${msg}` }).eq("id", camp.id);
            // recipient stays pending; try the next account for it
            continue;
          }
        }

        const wait = 1000 - (Date.now() - lastSend);
        if (wait > 0) await sleep(wait);
        lastSend = Date.now();

        const vars = { klick_domain: acc.klick_domain, first_name: rec.first_name, last_name: rec.last_name, anrede: rec.anrede };
        try {
          await mailer.send({
            from: { name: acc.from_name || acc.label || acc.host, email: acc.from_email || acc.user_email },
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
          failedInCamp++; result.failed++;
          mailers.delete(acc.id);
          try { await mailer.close(); } catch { /* ignore */ }
          await supabaseAdmin.from("campaign_recipients").update({ status: "failed", error: msg, smtp_account_used: acc.id, sent_at: new Date().toISOString() }).eq("id", rec.id);
        }
        await supabaseAdmin.from("campaigns").update({ sent: sentInCamp, failed: failedInCamp, rr_index: rr, last_error: null }).eq("id", camp.id);
      }
      if (stop) break;
    }
  } finally {
    for (const m of mailers.values()) { try { await m.close(); } catch { /* ignore */ } }
    await supabaseAdmin.rpc("release_sender_lock");
  }
  return result;
}
