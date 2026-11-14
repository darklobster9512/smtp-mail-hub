import { describe, expect, it } from "vitest";
import { parseSmtpLines } from "@/lib/smtp-import";

describe("parseSmtpLines", () => {
  it("Doppelpunkt-Format", () => expect(parseSmtpLines("smtp.a.de:587:a@a.de:geheim").valid[0]).toEqual({ host: "smtp.a.de", port: 587, user_email: "a@a.de", password: "geheim" }));
  it("Semikolon-Format", () => expect(parseSmtpLines("smtp.a.de;465;a@a.de;pw").valid[0]!.port).toBe(465));
  it("Passwort mit Doppelpunkt", () => expect(parseSmtpLines("smtp.a.de:587:a@a.de:pa:ss").valid[0]!.password).toBe("pa:ss"));
  it("Duplikate im Text und gegenüber bestehenden", () => {
    const r = parseSmtpLines("h.de:587:a@a.de:x\nH.de:587:A@a.de:y\nh.de:587:b@a.de:z", [{ host: "h.de", user_email: "b@a.de" }]);
    expect(r.valid).toHaveLength(1);
    expect(r.duplicates).toBe(2);
  });
  it("ungültiger Port", () => expect(parseSmtpLines("h.de:99999:a@a.de:x").invalid[0]!.reason).toBe("ungültiger Port"));
});
