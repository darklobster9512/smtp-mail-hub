// Opens SMTP/HTTPS connections through an HTTP CONNECT or SOCKS5 proxy on top of
// `cloudflare:sockets` (the only outbound TCP API of the published runtime).
// Error messages never contain proxy credentials.
import { connect as rawConnect } from "cloudflare:sockets";
import type { ParsedProxy } from "./proxy-url";

type Mode = "off" | "starttls" | "on";

export interface RawSocket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  opened: Promise<unknown>;
  closed: Promise<void>;
  close(): Promise<void>;
  startTls(options?: { expectedServerHostname?: string }): RawSocket;
}
export type RawConnect = (addr: { hostname: string; port: number }, opts: { secureTransport: Mode; allowHalfOpen: boolean }) => RawSocket;

/** Failure while reaching the proxy or while the proxy builds the tunnel (retry/penalty applies). */
export class ProxyConnectError extends Error {
  override name = "ProxyConnectError";
}

type State = { raw: RawSocket; reader: ReadableStreamDefaultReader<Uint8Array>; writer: WritableStreamDefaultWriter<Uint8Array>; pending: Uint8Array | null };

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Buffered reader used during the proxy handshake; leftover bytes are handed to the tunnel. */
class ByteReader {
  private buf = new Uint8Array(0);
  constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) {}
  private async fill() {
    const { value, done } = await this.reader.read();
    if (done || !value) throw new Error("Proxy hat die Verbindung geschlossen");
    const n = new Uint8Array(this.buf.length + value.length);
    n.set(this.buf); n.set(value, this.buf.length);
    this.buf = n;
  }
  async exact(len: number): Promise<Uint8Array> {
    while (this.buf.length < len) await this.fill();
    const out = this.buf.slice(0, len);
    this.buf = this.buf.slice(len);
    return out;
  }
  async until(delim: string, max = 16384): Promise<string> {
    for (;;) {
      const text = dec.decode(this.buf);
      const i = text.indexOf(delim);
      if (i >= 0) {
        const headBytes = enc.encode(text.slice(0, i + delim.length)).length;
        const head = text.slice(0, i + delim.length);
        this.buf = this.buf.slice(headBytes);
        return head;
      }
      if (this.buf.length > max) throw new Error("Proxy-Antwort zu groß");
      await this.fill();
    }
  }
  rest(): Uint8Array | null { return this.buf.length ? this.buf : null; }
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([p, new Promise<never>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); })]).finally(() => clearTimeout(t));
}

async function httpConnect(r: ByteReader, w: WritableStreamDefaultWriter<Uint8Array>, p: ParsedProxy, host: string, port: number) {
  const target = host.includes(":") ? `[${host}]:${port}` : `${host}:${port}`;
  let req = `CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\nProxy-Connection: Keep-Alive\r\n`;
  if (p.username !== null || p.password !== null) {
    req += `Proxy-Authorization: Basic ${btoa(unescape(encodeURIComponent(`${p.username ?? ""}:${p.password ?? ""}`)))}\r\n`;
  }
  await w.write(enc.encode(req + "\r\n"));
  const head = await r.until("\r\n\r\n");
  const status = /^HTTP\/1\.[01] (\d{3})/.exec(head)?.[1];
  if (status !== "200") {
    throw new Error(status === "407" ? "Proxy lehnt die Anmeldung ab (407)" : `Proxy-Tunnel abgelehnt (HTTP ${status ?? "?"})`);
  }
}

const SOCKS_ERR: Record<number, string> = {
  1: "allgemeiner Fehler", 2: "Verbindung nicht erlaubt", 3: "Netzwerk nicht erreichbar", 4: "Host nicht erreichbar",
  5: "Verbindung abgelehnt", 6: "TTL abgelaufen", 7: "Befehl nicht unterstützt", 8: "Adresstyp nicht unterstützt",
};

async function socks5Connect(r: ByteReader, w: WritableStreamDefaultWriter<Uint8Array>, p: ParsedProxy, host: string, port: number) {
  const hasAuth = p.username !== null || p.password !== null;
  await w.write(Uint8Array.from(hasAuth ? [5, 2, 0, 2] : [5, 1, 0]));
  const [ver, method] = await r.exact(2) as unknown as [number, number];
  if (ver !== 5) throw new Error("Kein SOCKS5-Proxy");
  if (method === 2) {
    const u = enc.encode(p.username ?? ""), pw = enc.encode(p.password ?? "");
    if (u.length > 255 || pw.length > 255) throw new Error("SOCKS5-Zugangsdaten zu lang");
    await w.write(Uint8Array.from([1, u.length, ...u, pw.length, ...pw]));
    const auth = await r.exact(2);
    if (auth[1] !== 0) throw new Error("Proxy lehnt die Anmeldung ab");
  } else if (method !== 0) {
    throw new Error("Proxy unterstützt keine passende Anmeldemethode");
  }
  const hb = enc.encode(host);
  if (hb.length > 255) throw new Error("Zielhost zu lang");
  await w.write(Uint8Array.from([5, 1, 0, 3, hb.length, ...hb, port >> 8, port & 255]));
  const head = await r.exact(4);
  if (head[1] !== 0) throw new Error(`Proxy-Tunnel abgelehnt: ${SOCKS_ERR[head[1] ?? -1] ?? `Code ${head[1]}`}`);
  const atyp = head[3];
  if (atyp === 1) await r.exact(4 + 2);
  else if (atyp === 4) await r.exact(16 + 2);
  else if (atyp === 3) { const l = ((await r.exact(1))[0] ?? 0); await r.exact(l + 2); }
  else throw new Error("Ungültige SOCKS5-Antwort");
}

function wrap(setup: Promise<State>, targetHost: string): RawSocket {
  let state: State | null = null;
  const ready = setup.then((s) => { state = s; });
  ready.catch(() => { /* surfaced through opened/readable/writable */ });

  const readable = new ReadableStream<Uint8Array>(
    {
      async pull(ctrl) {
        await ready;
        const s = state;
        if (!s) throw new Error("Verbindung nicht bereit");
        if (s.pending) { const c = s.pending; s.pending = null; ctrl.enqueue(c); return; }
        const { value, done } = await s.reader.read();
        if (done) ctrl.close(); else if (value) ctrl.enqueue(value);
      },
    },
    // No read-ahead: nothing is consumed from the real socket while the client is not reading,
    // which keeps the socket clean for the STARTTLS upgrade.
    new CountQueuingStrategy({ highWaterMark: 0 }),
  );
  const writable = new WritableStream<Uint8Array>({
    async write(chunk) { await ready; await (await setup).writer.write(chunk); },
    async close() { await ready; await (await setup).writer.close(); },
    async abort() { try { await ready; await (await setup).raw.close(); } catch { /* ignore */ } },
  });
  const closed = ready.then(() => setup.then((s) => s.raw.closed));
  closed.catch(() => { /* ignore */ });

  return {
    readable, writable,
    opened: ready.then(() => ({})),
    closed,
    async close() { try { await ready; await (await setup).raw.close(); } catch { /* ignore */ } },
    startTls(options) {
      return wrap(ready.then(() => {
        const s = state;
        if (!s) throw new Error("Verbindung nicht bereit");
        s.reader.releaseLock();
        s.writer.releaseLock();
        const secured = s.raw.startTls({ expectedServerHostname: options?.expectedServerHostname ?? targetHost });
        return { raw: secured, reader: secured.readable.getReader(), writer: secured.writable.getWriter(), pending: null };
      }), targetHost);
    },
  };
}

export type TunnelOptions = { proxy: ParsedProxy; host: string; port: number; mode: Mode; handshakeTimeoutMs?: number; connect?: RawConnect };

/**
 * Returns a socket (same surface as a cloudflare:sockets Socket) that is tunnelled through the proxy.
 * mode "on": TLS to the target right after the tunnel is up; "starttls": caller upgrades later; "off": plain.
 */
export function openTunnel(o: TunnelOptions): RawSocket {
  const connect = o.connect ?? (rawConnect as unknown as RawConnect);
  const timeout = o.handshakeTimeoutMs ?? 15000;
  const label = `${o.proxy.host}:${o.proxy.port}`;
  const setup = (async (): Promise<State> => {
    let raw: RawSocket;
    let reader: ReadableStreamDefaultReader<Uint8Array>;
    let writer: WritableStreamDefaultWriter<Uint8Array>;
    let br: ByteReader;
    try {
      raw = connect({ hostname: o.proxy.host, port: o.proxy.port }, { secureTransport: "starttls", allowHalfOpen: false });
      reader = raw.readable.getReader();
      writer = raw.writable.getWriter();
      br = new ByteReader(reader);
      await withTimeout((async () => {
        await raw.opened;
        await (o.proxy.protocol === "socks5" ? socks5Connect(br, writer, o.proxy, o.host, o.port) : httpConnect(br, writer, o.proxy, o.host, o.port));
      })(), timeout, "Zeitüberschreitung beim Proxy-Verbindungsaufbau");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      throw new ProxyConnectError(`Proxy ${label}: ${m}`);
    }
    const state: State = { raw, reader, writer, pending: br.rest() };
    if (o.mode !== "on") return state;
    // TLS to the real target (certificate is checked against the target host name).
    reader.releaseLock();
    writer.releaseLock();
    if (state.pending) throw new Error("Unerwartete Daten vor dem TLS-Start");
    const secured = raw.startTls({ expectedServerHostname: o.host });
    return { raw: secured, reader: secured.readable.getReader(), writer: secured.writable.getWriter(), pending: null };
  })();
  return wrap(setup, o.host);
}

/** Socket factory for the vendored worker-mailer (`connectSocket` option). */
export function proxySocketFactory(proxy: ParsedProxy, connect?: RawConnect) {
  return (addr: { hostname: string; port: number }, opts: { secureTransport: Mode }) =>
    openTunnel({ proxy, host: addr.hostname, port: addr.port, mode: opts.secureTransport, ...(connect ? { connect } : {}) });
}

function isIp(s: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(s) || (s.includes(":") && /^[0-9a-f:.]{2,45}$/i.test(s));
}

/** HTTPS GET https://api.ipify.org through the proxy; returns the exit IP. */
export async function fetchExitIp(proxy: ParsedProxy, connect?: RawConnect, timeoutMs = 20000): Promise<string> {
  const sock = openTunnel({ proxy, host: "api.ipify.org", port: 443, mode: "on", ...(connect ? { connect } : {}) });
  try {
    return await withTimeout((async () => {
      await sock.opened;
      const w = sock.writable.getWriter();
      await w.write(enc.encode("GET / HTTP/1.1\r\nHost: api.ipify.org\r\nAccept: text/plain\r\nUser-Agent: curl/8\r\nConnection: close\r\n\r\n"));
      w.releaseLock();
      const r = sock.readable.getReader();
      let text = "";
      for (let i = 0; i < 200; i++) {
        const { value, done } = await r.read();
        if (value) text += dec.decode(value, { stream: true });
        const sep = text.indexOf("\r\n\r\n");
        if (sep >= 0) {
          const body = text.slice(sep + 4).split(/\r?\n/).map((l) => l.trim()).find(isIp);
          if (body) return body;
        }
        if (done) break;
      }
      throw new Error("Unerwartete Antwort von api.ipify.org");
    })(), timeoutMs, "Zeitüberschreitung beim IP-Test");
  } finally {
    await sock.close();
  }
}
