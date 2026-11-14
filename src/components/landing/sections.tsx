import { Activity, Ban, Check, Globe, Mail, Server, ShieldCheck, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import tile1 from "@/assets/tile-1.jpg";
import tile2 from "@/assets/tile-2.jpg";
import tile3 from "@/assets/tile-3.jpg";
import tile4 from "@/assets/tile-4.jpg";

function Tag({ children, tone = "muted" }: { children: string; tone?: "muted" | "lime" | "pink" | "blue" }) {
  const tones = {
    muted: "bg-secondary text-muted-foreground",
    lime: "bg-primary text-primary-foreground",
    pink: "bg-neon-pink text-accent-foreground",
    blue: "bg-neon-blue text-accent-foreground",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase italic ${tones[tone]}`}>{children}</span>;
}

const nav: [string, string, string?][] = [
  ["Entdecken", "#top"], ["SMTP", "#ablauf"], ["API", "#ablauf"], ["Webhooks", "#funktionen", "Neu"],
  ["Statistiken", "#funktionen", "Top"], ["Dedizierte IPs", "#funktionen"], ["Preise", "#preise"], ["FAQ", "#faq"],
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center gap-6 px-4">
        <a href="#top" className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Mail className="h-4 w-4" />
        </a>
        <nav className="no-scrollbar hidden flex-1 items-center gap-5 overflow-x-auto text-sm text-muted-foreground lg:flex">
          {nav.map(([l, h, t], i) => (
            <a key={l} href={h} className={`flex shrink-0 items-center gap-1.5 hover:text-foreground ${i === 0 ? "text-primary" : ""}`}>
              {l} {t && <Tag tone={t === "Top" ? "lime" : "muted"}>{t}</Tag>}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="border-primary/40 text-primary">Login</Button>
          <Button size="sm">Registrieren</Button>
        </div>
      </div>
    </header>
  );
}

const stats = [["99,99", "% Zustellung"], ["<1", "Sek. Versand"], ["EU", "Server"], ["24/7", "Monitoring"]];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-4 pb-16 pt-12">
      <div className="bg-tiles absolute inset-0" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="text-neon font-display text-6xl uppercase leading-[0.9] tracking-tight md:text-8xl">
          E-Mail per SMTP.<br />Einfach. Schnell.
        </h1>
        <div className="mt-10 flex gap-3">
          {stats.map(([v, l]) => (
            <div key={l} className="flex flex-col items-center">
              <div className="flex h-20 min-w-20 items-center justify-center rounded-xl border border-neon-pink/30 bg-card px-3 font-display text-3xl shadow-pink md:text-4xl">
                {v}
              </div>
              <span className="mt-2 text-xs text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="mt-8 font-semibold shadow-glow">
          <a href="#preise">3.000 Mails gratis starten</a>
        </Button>
      </div>
    </section>
  );
}

const tiles = [
  { img: tile1, over: "SMTP IN 5 MINUTEN", t: "SCHNELLSTART", d: "Zugangsdaten rein, Mails raus." },
  { img: tile2, over: "99,99 % ZUSTELLUNG", t: "INFRASTRUKTUR", d: "Redundante Server, keine Ausfälle." },
  { img: tile3, over: "IM POSTFACH. NICHT IM SPAM.", t: "REPUTATION", d: "SPF, DKIM und DMARC automatisch." },
  { img: tile4, over: "MADE IN EU", t: "DSGVO-KONFORM", d: "Alle Daten bleiben in Europa." },
];

export function Stats() {
  return (
    <section className="no-scrollbar flex gap-5 overflow-x-auto px-4 pb-12">
      {tiles.map((x, i) => (
        <article key={x.t} className="w-[80vw] shrink-0 md:w-[30vw]">
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <img src={x.img} alt={x.t} width={1088} height={608} loading={i ? "lazy" : undefined} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-background/30 p-6">
              <span className={`text-center font-display text-3xl uppercase leading-none md:text-4xl ${i % 2 ? "text-foreground" : "text-primary"}`}>
                {x.over}
              </span>
            </div>
          </div>
          <h3 className="mt-3 font-bold">{x.t}</h3>
          <p className="text-sm text-muted-foreground">{x.d}</p>
        </article>
      ))}
    </section>
  );
}

const features = [
  [Server, "SMTP-Relay & API", "Senden wie du willst", "Top", "lime"],
  [ShieldCheck, "SPF / DKIM / DMARC", "Automatisch eingerichtet", "Auto", "blue"],
  [Activity, "Echtzeit-Statistiken", "Jede Mail live verfolgen", "Neu", "lime"],
  [Webhooks, "Webhooks", "Ereignisse an dein System", "Neu", "pink"],
  [Ban, "Bounce-Verwaltung", "Ungültige Adressen sperren", "", "muted"],
  [Globe, "Dedizierte IPs", "Volle Kontrolle", "Pro", "blue"],
] as const;

function Webhooks(props: { className?: string }) {
  return <Webhook {...props} />;
}

export function Features() {
  return (
    <section id="funktionen" className="grid gap-4 px-4 pb-16 lg:grid-cols-[1fr_2fr]">
      <div className="bg-promo relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-neon-pink/30 p-10 text-center">
        <div className="bg-tiles absolute inset-0" />
        <div className="relative">
          <h2 className="text-neon font-display text-5xl uppercase leading-none">3.000 Mails<br />Gratis</h2>
          <p className="mt-4 text-foreground/90">Jeden Monat. Ohne Kreditkarte.</p>
          <Button asChild className="mt-6 font-semibold shadow-glow"><a href="#preise">Jetzt starten</a></Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map(([Icon, t, d, tag, tone]) => (
          <div key={t} className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/50">
            <Icon className="h-5 w-5 text-foreground" />
            <div className="mt-10">
              <div className="flex items-center gap-2 font-semibold">{t} {tag && <Tag tone={tone}>{tag}</Tag>}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = ["Domain verifizieren", "Zugangsdaten eintragen", "Senden"];

export function Steps() {
  return (
    <section id="ablauf" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-5xl uppercase leading-none">In 5 Minuten<br /><span className="text-primary">startklar.</span></h2>
        <ol className="mt-8 space-y-4">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <span className="font-display text-2xl text-primary">0{i + 1}</span>
              <span className="font-semibold">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-xl border border-border bg-card font-mono text-sm shadow-pink">
        <div className="flex gap-2 border-b border-border px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-neon-pink" />
          <span className="h-3 w-3 rounded-full bg-chart-4" />
          <span className="h-3 w-3 rounded-full bg-primary" />
        </div>
        <pre className="overflow-x-auto p-5 leading-7 text-muted-foreground">
{`$ telnet smtp.postwerk.de 587
`}<span className="text-primary">220 postwerk ESMTP ready</span>{`
AUTH LOGIN ********
`}<span className="text-primary">235 Authentication successful</span>{`
MAIL FROM:<hallo@meine-app.de>
RCPT TO:<kunde@example.com>
`}<span className="text-primary">250 OK – zugestellt in 312 ms</span>{`
`}<span className="caret text-foreground">▍</span>
        </pre>
      </div>
    </section>
  );
}

const plans = [
  { n: "Free", p: "0 €", q: "3.000 Mails / Monat", f: ["SMTP & API", "1 Domain", "Basis-Statistiken"] },
  { n: "Pro", p: "19 €", q: "50.000 Mails / Monat", f: ["Alles aus Free", "10 Domains", "Webhooks", "E-Mail-Support"], hot: true },
  { n: "Business", p: "89 €", q: "300.000 Mails / Monat", f: ["Alles aus Pro", "Dedizierte IP", "Unbegrenzte Domains", "Prioritäts-Support"] },
];

export function Pricing() {
  return (
    <section id="preise" className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-5xl uppercase">Preise</h2>
      <p className="mt-2 text-muted-foreground">Monatlich kündbar. Zzgl. MwSt.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((pl) => (
          <div key={pl.n} className={`rounded-xl border bg-card p-8 ${pl.hot ? "border-primary shadow-glow" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold uppercase">{pl.n}</h3>
              {pl.hot && <Tag tone="pink">Beliebt</Tag>}
            </div>
            <div className="mt-4 font-display text-5xl">{pl.p}<span className="font-sans text-base text-muted-foreground"> /Monat</span></div>
            <div className="mt-1 text-sm text-primary">{pl.q}</div>
            <ul className="mt-6 space-y-2 text-sm">
              {pl.f.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>)}
            </ul>
            <Button className="mt-8 w-full font-semibold" variant={pl.hot ? "default" : "secondary"}>{pl.n} wählen</Button>
          </div>
        ))}
      </div>
    </section>
  );
}

const faqs: [string, string][] = [
  ["Welche Ports werden unterstützt?", "587 (STARTTLS), 465 (SSL/TLS) und 2525 als Ausweichport."],
  ["Sind meine Daten DSGVO-konform?", "Ja. Alle Server stehen in der EU, ein Auftragsverarbeitungsvertrag ist inklusive."],
  ["Kann ich Newsletter versenden?", "Ja, mit Double-Opt-in und Abmeldelink. Für große Kampagnen empfehlen wir eine dedizierte IP."],
  ["Was passiert, wenn ich mein Kontingent überschreite?", "Wir benachrichtigen dich rechtzeitig. Du kannst jederzeit upgraden."],
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
      <h2 className="font-display text-5xl uppercase">FAQ</h2>
      <Accordion type="single" collapsible className="mt-8">
        {faqs.map(([q, a]) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="text-left">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function Cta() {
  return (
    <section className="px-4 pb-10">
      <div className="bg-promo relative overflow-hidden rounded-2xl border border-neon-pink/30 p-16 text-center">
        <div className="bg-tiles absolute inset-0" />
        <div className="relative">
          <h2 className="text-neon font-display text-5xl uppercase md:text-7xl">Bereit zum Senden?</h2>
          <Button asChild size="lg" className="mt-8 font-semibold shadow-glow"><a href="#preise">Kostenlos starten</a></Button>
        </div>
      </div>
      <footer className="mt-10 flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <span>© 2026 Postwerk</span>
        <div className="flex gap-6"><span>Impressum</span><span>Datenschutz</span><span>Status</span></div>
      </footer>
    </section>
  );
}
