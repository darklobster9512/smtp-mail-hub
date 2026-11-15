import { describe, expect, it } from "vitest";
import { distributeLinks, parseLinks } from "@/lib/klick-distribute";

describe("distributeLinks", () => {
  it("teilt 10 Konten auf 3 Links gleichmäßig (4/3/3), jedes Konto genau einmal", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `a${i}`);
    const m = distributeLinks(ids, ["x", "y", "z"]);
    const sizes = [...m.values()].map((g) => g.length).sort();
    expect(sizes).toEqual([3, 3, 4]);
    expect([...m.values()].flat().sort()).toEqual([...ids].sort());
  });
  it("mehr Links als Konten: jedes Konto bekommt einen Link", () => {
    const m = distributeLinks(["a", "b"], ["x", "y", "z"]);
    expect([...m.values()].flat().length).toBe(2);
  });
});

describe("parseLinks", () => {
  it("ignoriert leere Zeilen und Duplikate, markiert Zeilen mit Leerzeichen", () => {
    const r = parseLinks("https://a.de\n\n  https://a.de \nhttps://b.de\nkaputt link");
    expect(r.links).toEqual(["https://a.de", "https://b.de"]);
    expect(r.invalid).toEqual(["kaputt link"]);
  });
});
