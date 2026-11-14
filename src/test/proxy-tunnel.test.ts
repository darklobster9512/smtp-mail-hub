// @vitest-environment node
import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProxyConnectError, openTunnel } from "@/lib/proxy-socket.server";
import type { ParsedProxy } from "@/lib/proxy-url";

const servers: net.Server[] = [];
const listen = (s: net.Server) => new Promise<number>((res) => { servers.push(s); s.listen(0, "127.0.0.1", () => res((s.address() as net.AddressInfo).port)); });
afterAll(() => servers.forEach((s) => s.close()));

let smtpPort = 0, httpPort = 0, socksPort = 0, socksNoAuthPort = 0;
const seen: string[] = [];

beforeAll(async () => {
  // fake SMTP-like server: greets immediately, echoes lines
  smtpPort = await listen(net.createServer((c) => { c.write("220 hello\r\n"); c.on("data", (d) => c.write(`ECHO ${d}`)); c.on("error", () => {}); }));
  // HTTP CONNECT proxy with Basic auth; sends target banner in the same write as the 200 response when possible
  httpPort = await listen(net.createServer((c) => {
    c.once("data", (d) => {
      const req = d.toString();
      seen.push(req.split("\r\n")[0]!);
      if (!req.includes("Proxy-Authorization: Basic " + Buffer.from("u:p").toString("base64"))) return void c.end("HTTP/1.1 407 Proxy Authentication Required\r\n\r\n");
      const [host, port] = req.split(" ")[1]!.split(":");
      const up = net.connect(Number(port), host!);
      up.once("data", (b) => { c.write(Buffer.concat([Buffer.from("HTTP/1.1 200 Connection established\r\n\r\n"), b])); up.pipe(c); c.pipe(up); });
      up.on("error", () => c.end()); c.on("error", () => up.destroy());
    });
    c.on("error", () => {});
  }));
  const socks = (auth: boolean) => net.createServer((c) => {
    c.on("error", () => {});
    c.once("data", (g) => {
      if (auth) {
        c.write(Buffer.from([5, 2]));
        c.once("data", (a) => {
          const ul = a[1]!; const user = a.subarray(2, 2 + ul).toString(); const pl = a[2 + ul]!; const pass = a.subarray(3 + ul, 3 + ul + pl).toString();
          if (user !== "u" || pass !== "p") return void c.end(Buffer.from([1, 1]));
          c.write(Buffer.from([1, 0])); request();
        });
      } else { c.write(Buffer.from([5, 0])); request(); }
      void g;
      function request() {
        c.once("data", (r) => {
          const l = r[4]!; const host = r.subarray(5, 5 + l).toString(); const port = r.readUInt16BE(5 + l);
          seen.push(`socks ${host}:${port}`);
          const up = net.connect(port, host);
          up.once("data", (b) => { c.write(Buffer.concat([Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]), b])); up.pipe(c); c.pipe(up); });
          up.on("error", () => c.end(Buffer.from([5, 5, 0, 1, 0, 0, 0, 0, 0, 0])));
        });
      }
    });
  });
  socksPort = await listen(socks(true));
  socksNoAuthPort = await listen(socks(false));
});

const proxy = (protocol: "http" | "socks5", port: number, u: string | null = "u", p: string | null = "p"): ParsedProxy => ({ protocol, host: "127.0.0.1", port, username: u, password: p });

async function talk(sock: ReturnType<typeof openTunnel>) {
  await sock.opened;
  const r = sock.readable.getReader(); const w = sock.writable.getWriter();
  const banner = new TextDecoder().decode((await r.read()).value);
  await w.write(new TextEncoder().encode("PING\r\n"));
  const echo = new TextDecoder().decode((await r.read()).value);
  await sock.close();
  return { banner, echo };
}

describe("proxy tunnel (real sockets)", () => {
  it("HTTP CONNECT: keeps a banner that arrives together with the 200 response", async () => {
    const r = await talk(openTunnel({ proxy: proxy("http", httpPort), host: "127.0.0.1", port: smtpPort, mode: "starttls" }));
    expect(r.banner).toBe("220 hello\r\n");
    expect(r.echo).toBe("ECHO PING\r\n");
    expect(seen).toContain(`CONNECT 127.0.0.1:${smtpPort} HTTP/1.1`);
  });
  it("SOCKS5 with username/password", async () => {
    const r = await talk(openTunnel({ proxy: proxy("socks5", socksPort), host: "127.0.0.1", port: smtpPort, mode: "starttls" }));
    expect(r.banner).toBe("220 hello\r\n");
    expect(r.echo).toBe("ECHO PING\r\n");
  });
  it("SOCKS5 without authentication", async () => {
    const r = await talk(openTunnel({ proxy: proxy("socks5", socksNoAuthPort, null, null), host: "127.0.0.1", port: smtpPort, mode: "off" }));
    expect(r.banner).toBe("220 hello\r\n");
  });
  it("wrong credentials are reported as proxy errors without leaking them", async () => {
    const s = openTunnel({ proxy: proxy("http", httpPort, "u", "WRONGSECRET"), host: "127.0.0.1", port: smtpPort, mode: "off" });
    const err = (await s.opened.catch((e: unknown) => e)) as Error;
    expect(err).toBeInstanceOf(ProxyConnectError);
    expect(String(err.message)).not.toContain("WRONGSECRET");
    const s2 = openTunnel({ proxy: proxy("socks5", socksPort, "u", "WRONGSECRET"), host: "127.0.0.1", port: smtpPort, mode: "off" });
    expect(await s2.opened.catch((e) => e)).toBeInstanceOf(ProxyConnectError);
  });
  it("an unreachable proxy is a proxy error (ECONNREFUSED)", async () => {
    const dead = net.createServer(); const port = await listen(dead); await new Promise((r) => dead.close(r));
    const s = openTunnel({ proxy: proxy("http", port), host: "127.0.0.1", port: smtpPort, mode: "off" });
    expect(await s.opened.catch((e) => e)).toBeInstanceOf(ProxyConnectError);
  });
});
