// Resend HTTP API sending (no Node deps; works on Workers and in tests).
export type ResendErrorKind = "auth" | "rate" | "reject";

export class ResendError extends Error {
  override name = "ResendError";
  constructor(message: string, readonly kind: ResendErrorKind, readonly status: number) { super(message); }
}

export function classifyResendStatus(status: number): ResendErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate";
  return "reject";
}

export function maskApiKey(key: string | null | undefined): string {
  if (!key) return "–";
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export type ResendMessage = { from: { name?: string; email: string }; to: { email: string }; subject: string; html?: string; text?: string };

export async function sendViaResend(apiKey: string, msg: ResendMessage, fetchFn: typeof fetch = fetch): Promise<void> {
  const name = msg.from.name?.replace(/["\r\n]/g, "");
  const res = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: name ? `"${name}" <${msg.from.email}>` : msg.from.email,
      to: [msg.to.email], subject: msg.subject,
      ...(msg.html ? { html: msg.html } : {}), ...(msg.text ? { text: msg.text } : {}),
    }),
  });
  if (res.ok) return;
  const body = await res.text().catch(() => "");
  let detail = body;
  try { const j = JSON.parse(body) as { message?: string }; if (j.message) detail = j.message; } catch { /* keep raw */ }
  const kind = classifyResendStatus(res.status);
  const prefix = kind === "auth" ? "Resend-API-Key ungültig" : kind === "rate" ? "Resend-Ratenlimit erreicht" : "Resend hat die Mail abgelehnt";
  throw new ResendError(`${prefix} [${res.status}]: ${detail.slice(0, 300)}`, kind, res.status);
}
