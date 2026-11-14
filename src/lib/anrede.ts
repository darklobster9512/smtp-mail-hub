// Häufigste deutsche Vornamen → Geschlecht. Unbekannte Namen bekommen die neutrale Anrede.
const MALE = "alexander andreas anton ben benjamin bernd christian christoph daniel david dennis dieter dirk elias emil erik fabian felix finn florian frank georg gerhard günter hans harald heinz helmut henry jakob jan jens joachim jonas jonathan jörg josef julian jürgen kai karl klaus konstantin kurt lars leon leo lukas luca lutz manfred marc marcel marco mario markus martin matthias max maximilian michael mike moritz niklas nico noah norbert oliver oskar patrick paul peter philipp rainer ralf reinhard rene robert roland rudolf sebastian simon stefan stephan sven thomas thorsten tim tobias torsten uwe volker walter werner wolfgang"
  .split(" ");
const FEMALE = "alexandra andrea angelika anja anna anne annika antje barbara bettina birgit brigitte carina carolin charlotte christa christina christine claudia clara cornelia daniela diana doris elena elisabeth ella emilia emma eva franziska frieda gabriele gisela hanna hannah heike helga ines ingrid irene jana jasmin jennifer jessica johanna julia juliane karin katharina kathrin katrin kerstin klara laura lea lena lina lisa luisa manuela maria marie marion martina melanie mia michaela monika nadine natalie nicole nina petra renate ruth sabine sabrina sandra sara sarah silke simone sofia sonja sophie stefanie stephanie susanne svenja tanja ursula ute vanessa vera verena yvonne"
  .split(" ");
const M = new Set(MALE);
const F = new Set(FEMALE);

export function guessGender(firstName: string | null | undefined): "m" | "f" | null {
  const n = (firstName ?? "").trim().split(/[\s-]+/)[0]?.toLowerCase() ?? "";
  if (M.has(n)) return "m";
  if (F.has(n)) return "f";
  return null;
}

export function buildAnrede(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const last = (lastName ?? "").trim();
  const g = guessGender(firstName);
  if (!last || !g) return "Sehr geehrte Damen und Herren";
  return g === "m" ? `Sehr geehrter Herr ${last}` : `Sehr geehrte Frau ${last}`;
}
