import { describe, expect, it } from "vitest";
import { fillTemplate, parseRecipients } from "@/lib/campaign-parse";

describe("parseRecipients", () => {
  it("parses email;Vorname;Nachname;Anrede lines", () => {
    const r = parseRecipients("max@example.com;Max;Mustermann;Herr\nanna@example.com");
    expect(r.valid).toEqual([
      { email: "max@example.com", first_name: "Max", last_name: "Mustermann", anrede: "Herr" },
      { email: "anna@example.com", first_name: "", last_name: "", anrede: "" },
    ]);
  });
  it("reports invalid lines with their line number and skips blank lines", () => {
    const r = parseRecipients("ok@example.com\n\nnot-an-email;X\nfoo@bar");
    expect(r.valid).toHaveLength(1);
    expect(r.invalid).toEqual([{ line: 3, text: "not-an-email;X" }, { line: 4, text: "foo@bar" }]);
  });
  it("drops duplicates case-insensitively and counts them", () => {
    const r = parseRecipients("a@example.com\nA@Example.com;Anna");
    expect(r.valid).toHaveLength(1);
    expect(r.duplicates).toBe(1);
  });
});

describe("fillTemplate", () => {
  it("replaces all placeholders and escapes HTML in recipient values", () => {
    const out = fillTemplate("{anrede} {first_name} {last_name} – {klick_domain}", { klick_domain: "k.example.com", first_name: "<b>Max</b>", last_name: "M", anrede: "Hallo" }, { html: true });
    expect(out).toBe("Hallo &lt;b&gt;Max&lt;/b&gt; M – k.example.com");
  });
  it("uses empty strings for missing values", () => {
    expect(fillTemplate("Hi {first_name}!", {}, { html: false })).toBe("Hi !");
  });
});
