import { describe, expect, it, vi } from "vitest";
import { detectProxyProtocol, isBlockedProxyHost, maskProxyUrl, parseProxyUrl } from "@/lib/proxy-url";
import { PROXY_DISABLE_AFTER, connectWithProxyRetry } from "@/lib/proxy-retry";
import { ProxyConnectError } from "@/lib/proxy-socket.server";
import { businessMail } from "@/lib/test-mail";

describe("proxy url", () => {
  it("detects the protocol from the prefix", () => {
    expect(detectProxyProtocol("http://u:p@h:8080")).toBe("http");
    expect(detectProxyProtocol("socks5://u:p@h:1080")).toBe("socks5");
    expect(detectProxyProtocol("ftp://h")).toBeNull();
  });
  it("masks credentials", () => {
    expect(maskProxyUrl("socks5://user:secret@proxy.example.com:1080")).toBe("socks5://***@proxy.example.com:1080");
    expect(maskProxyUrl("http://proxy.example.com:3128")).toBe("http://proxy.example.com:3128");
  });
  it("rejects local and private targets", () => {
    for (const h of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.169.254", "::1"]) expect(isBlockedProxyHost(h)).toBe(true);
    expect(isBlockedProxyHost("proxy.example.com")).toBe(false);
    expect(() => parseProxyUrl("http://169.254.169.254:80")).toThrow();
  });
  it("decodes credentials and defaults ports", () => {
    expect(parseProxyUrl("socks5://us%40er:p%3Aw@proxy.example.com")).toMatchObject({ username: "us@er", password: "p:w", port: 1080 });
  });
});

describe("proxy retry rules", () => {
  it("retries a proxy connection error exactly once and counts one failure", async () => {
    const attempt = vi.fn().mockRejectedValue(new ProxyConnectError("down"));
    const onProxyFailure = vi.fn().mockResolvedValue(undefined);
    await expect(connectWithProxyRetry({ attempt, onProxyFailure })).rejects.toThrow("down");
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(onProxyFailure).toHaveBeenCalledTimes(1);
  });
  it("does not count a failure when the retry succeeds", async () => {
    const attempt = vi.fn().mockRejectedValueOnce(new ProxyConnectError("blip")).mockResolvedValueOnce("ok");
    const onProxyFailure = vi.fn();
    await expect(connectWithProxyRetry({ attempt, onProxyFailure })).resolves.toBe("ok");
    expect(onProxyFailure).not.toHaveBeenCalled();
  });
  it("does not retry or count SMTP authentication errors", async () => {
    const attempt = vi.fn().mockRejectedValue(new Error("535 5.7.8 Username and Password not accepted"));
    const onProxyFailure = vi.fn();
    await expect(connectWithProxyRetry({ attempt, onProxyFailure })).rejects.toThrow("535");
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(onProxyFailure).not.toHaveBeenCalled();
  });
  it("disables a proxy after 5 consecutive failures", () => {
    expect(PROXY_DISABLE_AFTER).toBe(5);
  });
});

describe("business test mail", () => {
  const forbidden = /test|panel|debug|https?:\/\/|<a[\s>]|<button/i;
  it("never looks like a test and has no links", () => {
    for (let i = 0; i < 4; i++) {
      const m = businessMail("Max Muster", () => i / 4);
      expect(m.subject).not.toMatch(forbidden);
      expect(m.html).not.toMatch(forbidden);
      expect(m.text).not.toMatch(forbidden);
    }
  });
  it("uses the required greeting, closing and width", () => {
    const m = businessMail("Max <b>Muster</b>");
    expect(m.html).toContain("<strong>Guten Tag,</strong>");
    expect(m.html).toContain("Mit freundlichen Grüßen<br>Max &lt;b&gt;Muster&lt;/b&gt;");
    expect(m.html).toContain("max-width:600px");
  });
  it("picks only from the four realistic subjects", () => {
    const subjects = new Set([0, 0.3, 0.6, 0.99].map((r) => businessMail("A", () => r).subject));
    expect([...subjects].sort()).toEqual(["Informationen zu Ihrem Konto", "Rückmeldung zu Ihrer Anfrage", "Ihre Anfrage wurde erhalten", "Vielen Dank für Ihre Nachricht"].sort());
  });
});
