export function parseLinks(text: string): { links: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const links: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/\s/.test(line)) { invalid.push(line); continue; }
    if (seen.has(line)) continue;
    seen.add(line);
    links.push(line);
  }
  return { links, invalid };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** Mischt Konten und Links und teilt reihum zu: Gruppengrößen unterscheiden sich max. um 1. */
export function distributeLinks(accountIds: string[], links: string[], rng: () => number = Math.random): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!links.length) return out;
  const ls = shuffle(links, rng);
  const ids = shuffle(accountIds, rng);
  ids.forEach((id, i) => {
    const l = ls[i % ls.length] as string;
    const g = out.get(l) ?? [];
    g.push(id);
    out.set(l, g);
  });
  return out;
}
