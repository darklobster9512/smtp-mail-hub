// Dev-server only stand-in for the Workers `cloudflare:sockets` module (used by worker-mailer).
// Production runs on workerd which provides the real module; this file is never in the build.
import net from "node:net";
import tls from "node:tls";

// workerd has Uint8Array.prototype.toBase64; older Node does not.
const U8 = Uint8Array.prototype as unknown as { toBase64?: () => string };
if (!U8.toBase64) U8.toBase64 = function (this: Uint8Array) { return Buffer.from(this).toString("base64"); };

type Opts = { secureTransport?: "on" | "off" | "starttls"; allowHalfOpen?: boolean };

function wrap(sock: net.Socket, hostname: string, readyEvent: "connect" | "secureConnect") {
  let onData: ((b: Buffer) => void) | null = null;
  const readable = new ReadableStream<Uint8Array>({
    start(ctrl) {
      onData = (b) => ctrl.enqueue(new Uint8Array(b));
      sock.on("data", onData);
      sock.once("end", () => { try { ctrl.close(); } catch { /* closed */ } });
      sock.once("error", (e) => { try { ctrl.error(e); } catch { /* closed */ } });
    },
  });
  const writable = new WritableStream<Uint8Array>({
    write: (chunk) => new Promise<void>((res, rej) => sock.write(chunk, (e) => (e ? rej(e) : res()))),
    close: () => { sock.end(); },
  });
  const opened = new Promise<void>((res, rej) => {
    if (readyEvent === "connect" && !sock.connecting) return res();
    sock.once(readyEvent, () => res());
    sock.once("error", rej);
  });
  const closed = new Promise<void>((res) => sock.once("close", () => res()));
  return {
    readable, writable, opened, closed,
    close: async () => { sock.destroy(); },
    startTls: (o?: { expectedServerHostname?: string }) => {
      if (onData) sock.off("data", onData);
      const t = tls.connect({ socket: sock, servername: o?.expectedServerHostname ?? hostname });
      return wrap(t, hostname, "secureConnect");
    },
  };
}

export function connect(addr: { hostname: string; port: number } | string, opts: Opts = {}) {
  const { hostname, port } = typeof addr === "string" ? { hostname: addr.split(":")[0]!, port: Number(addr.split(":")[1]) } : addr;
  if (opts.secureTransport === "on") return wrap(tls.connect({ host: hostname, port, servername: hostname }), hostname, "secureConnect");
  return wrap(net.connect({ host: hostname, port }), hostname, "connect");
}
