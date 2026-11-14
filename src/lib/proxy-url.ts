import { z } from "zod";

export type ProxyProtocol = "http" | "socks5";

export type ParsedProxy = {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
};

/** Protocol from the URL prefix; null when it is not a supported proxy scheme. */
export function detectProxyProtocol(url: string): ProxyProtocol | null {
  const m = /^\s*([a-z0-9+.-]+):\/\//i.exec(url);
  const scheme = m?.[1]?.toLowerCase();
  if (scheme === "http") return "http";
  if (scheme === "socks5" || scheme === "socks5h") return "socks5";
  return null;
}

/** True for loopback, private, link-local and metadata targets (SSRF protection). */
export function isBlockedProxyHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (h.includes(":")) return h === "::" || h === "::1" || h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("::ffff:");
  return false;
}

/** Parses http:// or socks5:// URLs. Throws a message that never contains credentials. */
export function parseProxyUrl(raw: string): ParsedProxy {
  const protocol = detectProxyProtocol(raw);
  if (!protocol) throw new Error("Proxy-URL muss mit http:// oder socks5:// beginnen.");
  let u: URL;
  try {
    u = new URL(raw.trim().replace(/^socks5h:/i, "socks5:"));
  } catch {
    throw new Error("Proxy-URL ist ungültig.");
  }
  if (!u.hostname) throw new Error("Proxy-URL enthält keinen Host.");
  const port = u.port ? Number(u.port) : protocol === "http" ? 80 : 1080;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Proxy-Port ist ungültig.");
  if (isBlockedProxyHost(u.hostname)) throw new Error("Lokale oder private Proxy-Adressen sind nicht erlaubt.");
  return {
    protocol,
    host: u.hostname.replace(/^\[|\]$/g, ""),
    port,
    username: u.username ? decodeURIComponent(u.username) : null,
    password: u.password ? decodeURIComponent(u.password) : null,
  };
}

/** Display form without credentials, e.g. socks5://***@host:1080 */
export function maskProxyUrl(raw: string): string {
  try {
    const p = parseProxyUrl(raw);
    const auth = p.username || p.password ? "***@" : "";
    return `${p.protocol}://${auth}${p.host.includes(":") ? `[${p.host}]` : p.host}:${p.port}`;
  } catch {
    return "(ungültige URL)";
  }
}

export const proxyUrlSchema = z
  .string()
  .trim()
  .min(1, "Proxy-URL fehlt")
  .max(500)
  .superRefine((v, ctx) => {
    try {
      parseProxyUrl(v);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: e instanceof Error ? e.message : "Ungültige URL" });
    }
  });
