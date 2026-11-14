/** Neutral business message shared by the SMTP send path and preview checks. */
const subjects = ["Ihre Anfrage wurde erhalten", "Informationen zu Ihrem Konto", "Vielen Dank für Ihre Nachricht", "Rückmeldung zu Ihrer Anfrage"];
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

export function businessMail(senderName: string, random = Math.random) {
  const name = senderName.replace(/[\r\n]/g, " ");
  const subject = subjects[Math.min(subjects.length - 1, Math.max(0, Math.floor(random() * subjects.length)))] ?? subjects[0] ?? "Rückmeldung zu Ihrer Anfrage";
  return {
    subject,
    text: `Guten Tag,\n\nvielen Dank für Ihre Nachricht. Wir haben Ihr Anliegen erhalten und melden uns zeitnah mit einer ausführlichen Rückmeldung. Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\n${name}`,
    html: `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:24px 16px;background:#ffffff;color:#242424;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6"><div style="max-width:600px;margin:0 auto"><p style="margin:0 0 20px"><strong>Guten Tag,</strong></p><p style="margin:0 0 16px">vielen Dank für Ihre Nachricht. Wir haben Ihr Anliegen erhalten und melden uns zeitnah mit einer ausführlichen Rückmeldung.</p><p style="margin:0 0 24px">Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.</p><p style="margin:0;color:#555555">Mit freundlichen Grüßen<br>${escapeHtml(name)}</p></div></body></html>`,
  };
}
