import { createFileRoute } from "@tanstack/react-router";
import { Cta, Faq, Features, Header, Hero, Pricing, Stats, Steps } from "@/components/landing/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Postwerk – Zuverlässiger E-Mail-Versand per SMTP" },
      { name: "description", content: "SMTP-Relay und API mit EU-Servern, SPF/DKIM und Echtzeit-Statistiken. 3.000 Mails pro Monat kostenlos." },
      { property: "og:title", content: "Postwerk – Zuverlässiger E-Mail-Versand per SMTP" },
      { property: "og:description", content: "SMTP-Relay und API mit EU-Servern. 3.000 Mails pro Monat kostenlos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Steps />
        <Pricing />
        <Faq />
        <Cta />
      </main>
    </div>
  );
}
