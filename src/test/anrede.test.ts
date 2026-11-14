import { describe, expect, it } from "vitest";
import { buildAnrede } from "@/lib/anrede";
import { leadInputSchema } from "@/lib/leads-schema";

describe("buildAnrede", () => {
  it("Herr für männliche Vornamen", () => expect(buildAnrede("Thomas", "Müller")).toBe("Sehr geehrter Herr Müller"));
  it("Frau für weibliche Vornamen", () => expect(buildAnrede("julia", "Schmidt")).toBe("Sehr geehrte Frau Schmidt"));
  it("Fallback bei unbekanntem Namen", () => expect(buildAnrede("Xyz", "Meier")).toBe("Sehr geehrte Damen und Herren"));
  it("Fallback ohne Nachname", () => expect(buildAnrede("Thomas", "")).toBe("Sehr geehrte Damen und Herren"));
});

describe("lead input", () => {
  it("lehnt ungültige E-Mail ab", () => expect(leadInputSchema.safeParse({ email: "kaputt" }).success).toBe(false));
  it("akzeptiert gültige E-Mail", () => expect(leadInputSchema.safeParse({ email: "a@b.de" }).success).toBe(true));
});
