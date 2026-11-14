// Central SMTP sending used by test mails, campaigns and automatic lead mails.
// If the proxy pool is enabled and has active proxies, every new SMTP connection goes through one of them.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { connectWithProxyRetry } from "./proxy-retry";
import { parseProxyUrl } from "./proxy-url";
import { proxySocketFactory } from "./proxy-socket.server";
import { WorkerMailer } from "./vendor/worker-mailer.mjs";

export type SmtpAccountLike = { host: string; port: number; user_email: string; password: string | null };
export type MailMessage = {
  from: { name?: string; email: string };
  to: { email: string };
  subject: string;
  html?: string;
  text?: string;
};

/** Thrown when the SMTP connection could not be established (as opposed to a failure while sending). */
export class SmtpConnectError extends Error {
  override name = "SmtpConnectError";
  constructor(message: string, readonly viaProxy: boolean, readonly proxyFailure: boolean) { super(message); }
}

type Conn = { mailer: WorkerMailer; proxyId: string | null };

async function pickProxy() {
  const { data } = await supabaseAdmin.rpc("pick_mail_proxy");
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

async function openConnection(acc: SmtpAccountLike): Promise<Conn> {
  const proxyRow = await pickProxy();
  const base = {
    host: acc.host, port: acc.port, secure: acc.port === 465, startTls: acc.port !== 465,
    credentials: { username: acc.user_email, password: acc.password ?? "" }, authType: ["plain", "login"] as ("plain" | "login")[],
  };
  if (!proxyRow) return { mailer: await WorkerMailer.connect(base), proxyId: null };

  let parsed;
  try { parsed = parseProxyUrl(proxyRow.proxy_url); } catch (e) {
    await supabaseAdmin.rpc("record_mail_proxy_result", { _id: proxyRow.id, _ok: false });
    throw new SmtpConnectError(`Proxy „${proxyRow.label}“ hat eine ungültige URL.`, true, true);
  }
  try {
    const mailer = await connectWithProxyRetry({
      attempt: () => WorkerMailer.connect({ ...base, connectSocket: proxySocketFactory(parsed) }),
      onProxyFailure: async () => { await supabaseAdmin.rpc("record_mail_proxy_result", { _id: proxyRow.id, _ok: false }); },
    });
    return { mailer, proxyId: proxyRow.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const proxyFailure = e instanceof Error && e.name === "ProxyConnectError";
    throw new SmtpConnectError(proxyFailure ? `Proxy „${proxyRow.label}“: ${msg}` : msg, true, proxyFailure);
  }
}

export type Sender = {
  /** Sends one message with the given account. Throws SmtpConnectError if no connection could be made. */
  send(accountKey: string, acc: SmtpAccountLike, msg: MailMessage): Promise<void>;
  closeAll(): Promise<void>;
};

/**
 * Direct connections are reused per account within one run. With an active proxy a fresh connection is
 * opened per message so that every send picks a proxy again (rotating exit IPs).
 */
export function createSender(): Sender {
  const cache = new Map<string, WorkerMailer>();
  return {
    async send(key, acc, msg) {
      let conn: Conn | null = null;
      let mailer = cache.get(key);
      if (!mailer) {
        conn = await openConnection(acc).catch((e) => {
          if (e instanceof SmtpConnectError) throw e;
          throw new SmtpConnectError(e instanceof Error ? e.message : String(e), false, false);
        });
        mailer = conn.mailer;
        if (conn.proxyId === null) cache.set(key, mailer);
      }
      try {
        await mailer.send(msg);
        if (conn?.proxyId) await supabaseAdmin.rpc("record_mail_proxy_result", { _id: conn.proxyId, _ok: true });
      } catch (e) {
        cache.delete(key);
        try { await mailer.close(); } catch { /* ignore */ }
        conn = null;
        throw e;
      }
      if (conn && conn.proxyId !== null) { try { await mailer.close(); } catch { /* ignore */ } }
    },
    async closeAll() {
      for (const m of cache.values()) { try { await m.close(); } catch { /* ignore */ } }
      cache.clear();
    },
  };
}
