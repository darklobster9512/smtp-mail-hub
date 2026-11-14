import { describe, expect, it } from "vitest";
import { ResendError, classifyResendStatus, maskApiKey, sendViaResend } from "@/lib/resend-api";

const msg = { from: { name: "Firma", email: "a@b.de" }, to: { email: "c@d.de" }, subject: "S", html: "<p>x</p>" };
const fake = (status: number, body = "{}") => (async () => new Response(body, { status })) as unknown as typeof fetch;

describe("resend", () => {
  it("401 and 403 mean invalid key", () => { expect(classifyResendStatus(401)).toBe("auth"); expect(classifyResendStatus(403)).toBe("auth"); });
  it("429 is a rate limit", () => expect(classifyResendStatus(429)).toBe("rate"));
  it("422 is a rejection", () => expect(classifyResendStatus(422)).toBe("reject"));
  it("throws ResendError with kind and message", async () => {
    const err = await sendViaResend("re_x", msg, fake(422, '{"message":"domain not verified"}')).catch((e) => e);
    expect(err).toBeInstanceOf(ResendError);
    expect(err.kind).toBe("reject");
    expect(err.message).toContain("domain not verified");
  });
  it("sends bearer key and formatted from", async () => {
    let seen: RequestInit | undefined;
    await sendViaResend("re_key", msg, (async (_u: unknown, init?: RequestInit) => { seen = init; return new Response("{}", { status: 200 }); }) as typeof fetch);
    expect((seen!.headers as Record<string, string>)["Authorization"]).toBe("Bearer re_key");
    expect(JSON.parse(seen!.body as string).from).toBe('"Firma" <a@b.de>');
  });
  it("masks keys", () => expect(maskApiKey("re_1234567890abcd")).toBe("re_1…abcd"));
});
