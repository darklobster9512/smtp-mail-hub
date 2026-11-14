import { Activity, Check, Globe, Mail, Server, ShieldCheck, Webhook, Zap, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2 font-bold">
          <Mail className="h-5 w-5 text-primary" /> Postwerk
        </a>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#funktionen" className="hover:text-foreground">Funktionen</a>
          <a href="#ablauf" className="hover:text-foreground">Doku</a>
          <a href="#preise" className="hover:text-foreground">Preise</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <Button asChild size="sm"><a href="#preise">Kostenlos starten</a></Button>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
        <div>
          <p className="mb-4 inline-block rounded-full border border-primary/40 bg-accent px-3 py-1 font-mono text-xs text-accent-foreground">
            ● smtp.postwerk.de:587 online
          </p>
          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Zuverlässiger E-Mail-Versand per <span className="text-primary">SMTP</span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Zugangsdaten eintragen, senden, fertig. Postwerk bringt deine Mails ins Postfach – nicht in den Spam. Server in der EU.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-glow"><a href="#preise">Kostenlos starten</a></Button>
            <Button asChild size="lg" variant="outline"><a href="#ablauf">So funktioniert's</a></Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card font-mono text-sm shadow-glow">
          <div className="flex gap-2 border-b border-border px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-destructive" />
            <span className="h-3 w-3 rounded-full bg-chart-3" />
            <span className="h-3 w-3 rounded-full bg-primary" />
          </div>
          <pre className="overflow-x-auto p-5 leading-7 text-muted-foreground">
{`$ telnet smtp.postwerk.de 587
`}<span className="text-primary">220 postwerk ESMTP ready</span>{`
EHLO meine-app.de
AUTH LOGIN ********
`}<span className="text-primary">235 Authentication successful</span>{`
MAIL FROM:<hallo@meine-app.de>
RCPT TO:<kunde@example.com>
DATA
Subject: Deine Bestellung
`}<span className="text-primary">250 OK – zugestellt in 312 ms</span>{`
`}<span className="caret text-foreground">▍</span>
          </pre>
        </div>
      </div>
    </section>
  );
}

const stats = [
  ["99,99 %", "Zustellbarkeit"],
  ["< 1 s", "Versandzeit"],
  ["EU", "Server & DSGVO"],
  ["24/7", "Überwachung"],
];
export function Stats() {
  return (
    <section className="border-y border-border bg-card/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        {stats.map(([v, l]) => (
          <div key={l}>
            <div className="text-3xl font-bold text-primary">{v}</div>
            <div className="mt-1 text-sm text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const features = [
  [Server, "SMTP-Relay & API", "Klassisch per SMTP oder modern per REST-API – du entscheidest."],
  [ShieldCheck, "SPF, DKIM & DMARC", "Authentifizierung automatisch eingerichtet für beste Zustellung."],
  [Activity, "Echtzeit-Statistiken", "Zustellungen, Öffnungen und Fehler live im Dashboard."],
  [Webhook, "Webhooks", "Ereignisse sofort an dein System melden lassen."],
  [Ban, "Bounce-Verwaltung", "Ungültige Adressen werden automatisch gesperrt."],
  [Globe, "Dedizierte IPs", "Eigene Absender-IPs für hohe Volumen und volle Kontrolle."],
] as const;
export function Features() {
  return (
    <section id="funktionen" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-4xl font-bold">Alles für deinen Versand.</h2>
      <p className="mt-3 text-muted-foreground">Ohne eigenen Mailserver, ohne Kopfschmerzen.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map(([Icon, t, d]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/60">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  ["Domain verifizieren", "Drei DNS-Einträge setzen – wir prüfen automatisch."],
  ["Zugangsdaten eintragen", "Host, Port 587, Benutzer und Passwort in deine App."],
  ["Senden", "Deine Mails gehen raus. Du siehst jeden Schritt live."],
];
export function Steps() {
  return (
    <section id="ablauf" className="border-y border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-4xl font-bold">In 5 Minuten startklar.</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <div key={t}>
              <div className="font-mono text-sm text-primary">0{i + 1}</div>
              <h3 className="mt-2 text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
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
    <section id="preise" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-4xl font-bold">Faire Preise.</h2>
      <p className="mt-3 text-muted-foreground">Monatlich kündbar. Zzgl. MwSt.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {plans.map((pl) => (
          <div key={pl.n} className={`rounded-xl border bg-card p-8 ${pl.hot ? "border-primary shadow-glow" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{pl.n}</h3>
              {pl.hot && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Beliebt</span>}
            </div>
            <div className="mt-4 text-4xl font-bold">{pl.p}<span className="text-base font-normal text-muted-foreground"> /Monat</span></div>
            <div className="mt-1 font-mono text-sm text-primary">{pl.q}</div>
            <ul className="mt-6 space-y-2 text-sm">
              {pl.f.map((x) => <li key={x} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>)}
            </ul>
            <Button className="mt-8 w-full" variant={pl.hot ? "default" : "outline"}>{pl.n} wählen</Button>
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
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-4xl font-bold">Häufige Fragen</h2>
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
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-accent p-12 text-center">
        <Zap className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-4 text-4xl font-bold">Bereit zum Senden?</h2>
        <p className="mt-3 text-muted-foreground">3.000 Mails im Monat kostenlos. Keine Kreditkarte nötig.</p>
        <Button asChild size="lg" className="mt-8 shadow-glow"><a href="#preise">Jetzt kostenlos starten</a></Button>
      </div>
      <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
        <span>© 2026 Postwerk</span>
        <div className="flex gap-6"><span>Impressum</span><span>Datenschutz</span><span>Status</span></div>
      </footer>
    </section>
  );
}
