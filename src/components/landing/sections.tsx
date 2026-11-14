import { Activity, Ban, Check, Globe, Mail, Server, ShieldCheck, Webhook } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold">
          <Mail className="h-5 w-5 text-primary" /> Postwerk
        </a>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#funktionen" className="hover:text-foreground">Funktionen</a>
          <a href="#preise" className="hover:text-foreground">Preise</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="ml-auto flex gap-2">
          <Button asChild size="sm" variant="ghost"><Link to="/login">Login</Link></Button>
          <Button asChild size="sm"><Link to="/login">Registrieren</Link></Button>
        </div>
      </div>
    </header>
  );
}

const stats = [["99,99 %", "Zustellbarkeit"], ["< 1 s", "Versandzeit"], ["EU", "Server, DSGVO"], ["24/7", "Monitoring"]];

export function Hero() {
  return (
    <section id="top" className="mx-auto max-w-6xl px-6 pb-20 pt-24">
      <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
        E-Mail-Versand per <span className="text-primary">SMTP</span>. Einfach und zuverlässig.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Zugangsdaten eintragen, senden, fertig. Deine Mails landen im Postfach – nicht im Spam.
      </p>
      <Button asChild size="lg" className="mt-8 font-semibold"><a href="#preise">Kostenlos starten</a></Button>
      <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-8 md:grid-cols-4">
        {stats.map(([v, l]) => (
          <div key={l}>
            <div className="text-3xl font-semibold">{v}</div>
            <div className="mt-1 text-sm text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const features = [
  [Server, "SMTP-Relay & API", "Klassisch per SMTP oder per REST-API."],
  [ShieldCheck, "SPF, DKIM & DMARC", "Automatisch eingerichtet für beste Zustellung."],
  [Activity, "Echtzeit-Statistiken", "Jede Mail live verfolgen."],
  [Webhook, "Webhooks", "Ereignisse direkt an dein System."],
  [Ban, "Bounce-Verwaltung", "Ungültige Adressen werden gesperrt."],
  [Globe, "Dedizierte IPs", "Volle Kontrolle über deine Reputation."],
] as const;

export function Features() {
  return (
    <section id="funktionen" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-4xl font-semibold tracking-tight">Alles für deinen Versand</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(([Icon, t, d]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="mt-6 font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = ["Domain verifizieren", "Zugangsdaten eintragen", "Senden"];

export function Steps() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
      <div>
        <h2 className="text-4xl font-semibold tracking-tight">In 5 Minuten startklar</h2>
        <ol className="mt-8 space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <span className="font-mono text-sm text-primary">0{i + 1}</span>
              <span className="font-medium">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-xl border border-border bg-card font-mono text-sm">
        <pre className="overflow-x-auto p-6 leading-7 text-muted-foreground">
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
    <section id="preise" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-4xl font-semibold tracking-tight">Preise</h2>
      <p className="mt-2 text-muted-foreground">Monatlich kündbar. Zzgl. MwSt.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((pl) => (
          <div key={pl.n} className={`rounded-xl border bg-card p-8 ${pl.hot ? "border-primary" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{pl.n}</h3>
              {pl.hot && <span className="text-xs font-medium text-primary">Beliebt</span>}
            </div>
            <div className="mt-4 text-4xl font-semibold">{pl.p}<span className="text-base font-normal text-muted-foreground"> /Monat</span></div>
            <div className="mt-1 text-sm text-muted-foreground">{pl.q}</div>
            <ul className="mt-6 space-y-2 text-sm">
              {pl.f.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>)}
            </ul>
            <Button className="mt-8 w-full" variant={pl.hot ? "default" : "secondary"}>{pl.n} wählen</Button>
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
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <h2 className="text-4xl font-semibold tracking-tight">Häufige Fragen</h2>
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
    <section className="mx-auto max-w-6xl px-6 pb-10">
      <div className="rounded-2xl border border-border bg-card p-14 text-center">
        <h2 className="text-4xl font-semibold tracking-tight">Bereit zum Senden?</h2>
        <p className="mt-3 text-muted-foreground">3.000 Mails pro Monat kostenlos. Keine Kreditkarte nötig.</p>
        <Button asChild size="lg" className="mt-8 font-semibold"><a href="#preise">Kostenlos starten</a></Button>
      </div>
      <footer className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
        <span>© 2026 Postwerk</span>
        <div className="flex gap-6"><span>Impressum</span><span>Datenschutz</span><span>Status</span></div>
      </footer>
    </section>
  );
}
