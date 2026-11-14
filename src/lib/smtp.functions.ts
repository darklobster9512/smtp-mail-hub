import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const sendTestMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ account_id: z.string().uuid(), test_email_to: z.string().trim().email().max(254) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { success: false, error: "Keine Berechtigung." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: acc, error } = await supabaseAdmin.from("smtp_accounts").select("*").eq("id", data.account_id).maybeSingle();
    if (error || !acc) return { success: false, error: "Konto nicht gefunden." };
    if (!acc.password) return { success: false, error: "Für dieses Konto ist kein Passwort gespeichert." };

    const fromEmail = acc.from_email || acc.user_email;
    const label = acc.label || acc.host;
    try {
      const { WorkerMailer } = await import("worker-mailer");
      const mailer = await WorkerMailer.connect({
        host: acc.host,
        port: acc.port,
        secure: acc.port === 465,
        startTls: acc.port !== 465,
        credentials: { username: acc.user_email, password: acc.password },
        authType: ["plain", "login"],
      });
      await mailer.send({
        from: { name: acc.from_name || label, email: fromEmail },
        to: { email: data.test_email_to },
        subject: "Test",
        text: `Testmail von ${label} (${acc.host}:${acc.port}). Klick-Domain: ${acc.klick_domain || "–"}`,
        html: `<h2>Testmail</h2><p>Diese Testmail wurde erfolgreich über dein SMTP-Konto versendet.</p>
<ul><li>Konto: ${esc(label)}</li><li>Server: ${esc(acc.host)}:${acc.port}</li><li>Absender: ${esc(fromEmail)}</li><li>Klick-Domain: ${esc(acc.klick_domain || "–")}</li></ul>`,
      });
      await mailer.close();
      await supabaseAdmin.from("mail_logs").insert({ type: "info", message: `Testmail an ${data.test_email_to} über ${label} gesendet`, details: { account_id: acc.id } });
      return { success: true as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("sendTestMail failed", msg);
      await supabaseAdmin.from("mail_logs").insert({ type: "error", message: `Testmail über ${label} fehlgeschlagen`, details: { account_id: acc.id, error: msg } });
      return { success: false as const, error: msg };
    }
  });
