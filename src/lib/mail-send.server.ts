// Central sending for all paths (test mail, campaigns, auto leads): routes by account.provider.
// Placeholders must already be filled by the caller, so both providers get the same content.
import { createSender, type MailMessage } from "./smtp-transport.server";
import { sendViaResend } from "./resend-api";

export type MailAccount = {
  id: string; provider: string; host: string | null; port: number; user_email: string | null;
  password: string | null; api_key: string | null;
};

export function createMailer() {
  const smtp = createSender();
  return {
    async send(acc: MailAccount, msg: MailMessage) {
      if (acc.provider === "resend") {
        if (!acc.api_key) throw new Error("Für dieses Konto ist kein API-Key gespeichert.");
        return sendViaResend(acc.api_key, msg);
      }
      if (!acc.host || !acc.user_email) throw new Error("SMTP-Konto ohne Host oder Benutzer.");
      return smtp.send(acc.id, { host: acc.host, port: acc.port, user_email: acc.user_email, password: acc.password }, msg);
    },
    closeAll: () => smtp.closeAll(),
  };
}

export const senderName = (a: { from_name: string | null; label: string | null; host: string | null }) => a.from_name || a.label || a.host || "";
export const senderEmail = (a: { from_email: string | null; user_email: string | null }) => a.from_email || a.user_email || "";
