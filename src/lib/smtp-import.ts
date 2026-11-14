const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ImportRow = { host: string; port: number; user_email: string; password: string };
export type ImportResult = { valid: ImportRow[]; invalid: { line: number; reason: string }[]; duplicates: number };

/** Parses `host:port:user:pass` or `host;port;user;pass` lines. Everything after the 3rd separator is the password. */
export function parseSmtpLines(text: string, existing: { host: string; user_email: string }[] = []): ImportResult {
  const key = (h: string, u: string) => `${h.toLowerCase()}|${u.toLowerCase()}`;
  const seen = new Set(existing.map((e) => key(e.host, e.user_email)));
  const res: ImportResult = { valid: [], invalid: [], duplicates: 0 };
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;
    const sep = line.includes(";") && (!line.includes(":") || line.indexOf(";") < line.indexOf(":")) ? ";" : ":";
    const parts = line.split(sep);
    if (parts.length < 4) { res.invalid.push({ line: i + 1, reason: "zu wenige Felder" }); return; }
    const [host, portS, user] = parts.map((p) => p.trim());
    const password = parts.slice(3).join(sep);
    const port = Number(portS);
    if (!host || !/^[a-z0-9.-]+$/i.test(host)) { res.invalid.push({ line: i + 1, reason: "ungültiger Host" }); return; }
    if (!Number.isInteger(port) || port < 1 || port > 65535) { res.invalid.push({ line: i + 1, reason: "ungültiger Port" }); return; }
    if (!user || !EMAIL_RE.test(user)) { res.invalid.push({ line: i + 1, reason: "ungültige E-Mail" }); return; }
    if (!password) { res.invalid.push({ line: i + 1, reason: "Passwort fehlt" }); return; }
    const k = key(host, user);
    if (seen.has(k)) { res.duplicates++; return; }
    seen.add(k);
    res.valid.push({ host, port, user_email: user, password });
  });
  return res;
}
