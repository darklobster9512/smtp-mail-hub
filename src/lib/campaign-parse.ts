// Client- and server-safe helpers for campaign recipients and placeholders.
export type Recipient = { email: string; first_name: string; last_name: string; anrede: string };
export type ParseResult = {
  valid: Recipient[];
  invalid: { line: number; text: string }[];
  duplicates: number;
};

const EMAIL_RE = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]{2,}$/;
export const isEmail = (s: string) => s.length <= 254 && EMAIL_RE.test(s);

// One recipient per line: email;Vorname;Nachname;Anrede (everything after the email is optional).
export function parseRecipients(text: string): ParseResult {
  const valid: Recipient[] = [];
  const invalid: ParseResult["invalid"] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const [email = "", first = "", last = "", anrede = ""] = line.split(/[;\t,]/).map((p) => p.trim());
    if (!isEmail(email)) {
      invalid.push({ line: i + 1, text: line });
      return;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      return;
    }
    seen.add(key);
    valid.push({ email, first_name: first.slice(0, 100), last_name: last.slice(0, 100), anrede: anrede.slice(0, 100) });
  });
  return { valid, invalid, duplicates };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type Vars = { klick_domain?: string | null; first_name?: string | null; last_name?: string | null; anrede?: string | null };

export function fillTemplate(tpl: string, vars: Vars, opts: { html: boolean }): string {
  const f = opts.html ? esc : (s: string) => s;
  return tpl
    .replaceAll("{klick_domain}", f(vars.klick_domain ?? ""))
    .replaceAll("{first_name}", f(vars.first_name ?? ""))
    .replaceAll("{last_name}", f(vars.last_name ?? ""))
    .replaceAll("{anrede}", f(vars.anrede ?? ""));
}

export const SAMPLE_VARS: Vars = {
  klick_domain: "klick.example.com",
  first_name: "Max",
  last_name: "Mustermann",
  anrede: "Sehr geehrter Herr Mustermann",
};
