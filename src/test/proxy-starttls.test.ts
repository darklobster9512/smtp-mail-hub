// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import net from "node:net";
import tls from "node:tls";
import { execSync } from "node:child_process";
import { connect as shimConnect } from "@/dev/cloudflare-sockets-shim";
import { proxySocketFactory } from "@/lib/proxy-socket.server";
import { WorkerMailer } from "@/lib/vendor/worker-mailer.mjs";

let key = "", cert = "";
let smtpPort = 0, proxyPort = 0;
const servers: net.Server[] = [];
let received = "";

function smtpSession(sock: net.Socket | tls.TLSSocket, secure: boolean) {
  let buf = ""; let inData = false;
  const say = (s: string) => sock.write(s + "\r\n");
  sock.on("data", (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (inData) { if (line === ".") { inData = false; say("250 ok"); } else received += line + "\n"; continue; }
      const cmd = line.split(" ")[0]!.toUpperCase();
      if (cmd === "EHLO") say(secure ? "250-x\r\n250 AUTH PLAIN LOGIN" : "250-x\r\n250 STARTTLS");
      else if (cmd === "STARTTLS") {
        say("220 go");
        sock.removeAllListeners("data");
        const t = new tls.TLSSocket(sock, { isServer: true, key, cert });
        smtpSession(t, true);
        return;
      } else if (cmd === "AUTH") say("235 ok");
      else if (cmd === "MAIL" || cmd === "RCPT") say("250 ok");
      else if (cmd === "DATA") { inData = true; say("354 go"); }
      else if (cmd === "QUIT") { say("221 bye"); sock.end(); }
      else say("250 ok");
    }
  });
}

beforeAll(async () => {
  execSync("openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/pst-k.pem -out /tmp/pst-c.pem -days 2 -subj /CN=localhost 2>/dev/null");
  key = (await import("node:fs")).readFileSync("/tmp/pst-k.pem", "utf8");
  cert = (await import("node:fs")).readFileSync("/tmp/pst-c.pem", "utf8");
  const smtp = net.createServer((s) => { s.write("220 hi\r\n"); smtpSession(s, false); });
  const proxy = net.createServer((c) => {
    c.once("data", (d) => {
      const m = /^CONNECT ([^:]+):(\d+)/.exec(d.toString());
      const up = net.connect(Number(m![2]), "127.0.0.1", () => {
        c.write("HTTP/1.1 200 Connection established\r\n\r\n");
        c.pipe(up); up.pipe(c);
      });
    });
  });
  for (const s of [smtp, proxy]) { await new Promise<void>((r) => s.listen(0, "127.0.0.1", r)); servers.push(s); }
  smtpPort = (smtp.address() as net.AddressInfo).port;
  proxyPort = (proxy.address() as net.AddressInfo).port;
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
});
afterAll(() => servers.forEach((s) => s.close()));

describe("STARTTLS through HTTP proxy", () => {
  it("sends a mail without releaseLock error", async () => {
    const m = await WorkerMailer.connect({
      host: "localhost", port: smtpPort, secure: false, startTls: true,
      credentials: { username: "u", password: "p" }, authType: ["plain"],
      connectSocket: proxySocketFactory({ protocol: "http", host: "127.0.0.1", port: proxyPort } as never, shimConnect as never),
    } as never);
    await m.send({ from: "a@b.de", to: "c@d.de", subject: "Hallo", text: "Inhalt" } as never);
    await m.close();
    expect(received).toContain("Inhalt");
  }, 20000);
});
