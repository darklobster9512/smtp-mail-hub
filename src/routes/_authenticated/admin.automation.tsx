import { PUBLIC_BASE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/ui";
import { getSecretStatus } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/admin/automation")({
  head: () => ({ meta: [{ title: "Automatisierung – Postwerk Admin" }, { name: "description", content: "Lead-Schnittstelle, Versandtakt und Zeitsteuerung einrichten." }, { property: "og:title", content: "Automatisierung – Postwerk Admin" }, { property: "og:description", content: "Lead-Schnittstelle, Versandtakt und Zeitsteuerung einrichten." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Automation,
});

const BASE = PUBLIC_BASE_URL;
const INGEST_URL = `${BASE}/api/public/leads-ingest`;
const EXAMPLE_ONE = `{ "email": "max@beispiel.de", "first_name": "Max", "last_name": "Mustermann", "source": "landingpage" }`;
const EXAMPLE_MANY = `{ "leads": [ { "email": "a@beispiel.de" }, { "email": "c@beispiel.de", "first_name": "Cora" } ] }`;
const INGEST_CURL = `curl -X POST ${INGEST_URL} -H "Content-Type: application/json" -d '${EXAMPLE_ONE}'`;
const RESPONSE = `201 { "accepted": 1, "duplicates": 0, "duplicate": false, "scheduled_at": "2026-11-14T15:20:30Z" }
400 { "error": "Ungültige E-Mail-Adresse" }   – oder ungültiges JSON
413 { "error": "Höchstens 100 Leads pro Aufruf" }`;
const CURL = `curl -X POST ${BASE}/api/public/campaign-tick -H "x-cron-secret: DEIN_CRON_SECRET"`;

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5"><h2 className="mb-3 font-semibold">{title}</h2>{children}</section>;
}

function Automation() {
  const secretFn = useServerFn(getSecretStatus);
  const { data: secrets } = useQuery({ queryKey: ["secret-status"], queryFn: () => secretFn() });
  const { data: s } = useQuery({
    queryKey: ["leads-settings"],
    queryFn: async () => (await supabase.from("leads_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Kopiert"));

  return (
    <>
      <PageHeader title="Automatisierung" description="Versand-Takt, Schlüssel und Hilfe." />
      <div className="grid max-w-3xl gap-4">
        <Box title="Status">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Auto-Versand für Leads</span><span className={s?.auto_campaign_enabled ? "font-medium text-primary" : "text-muted-foreground"}>{s ? (s.auto_campaign_enabled ? "an" : "aus") : "–"}</span></li>
            {(["CRON_SECRET"] as const).map((k) => (
              <li key={k} className="flex justify-between">
                <code>{k}</code>
                <span className={secrets?.[k] ? "font-medium text-primary" : "font-medium text-destructive"}>{secrets ? (secrets[k] ? "✓ hinterlegt" : "✗ fehlt") : "…"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Geprüft wird nur, ob ein Wert existiert. Schlüssel werden in den Projekteinstellungen unter „Secrets“ angelegt. Einstellungen für Leads ändern unter <Link to="/admin/leads" className="text-primary underline">Leads</Link>.</p>
        </Box>
        <Box title="Lead-Schnittstelle (öffentlich, ohne Key)">
          <p className="text-sm text-muted-foreground">Externe Systeme schicken Leads per POST an diese Adresse. Sobald ein Lead eintrifft, wird er nach der eingestellten Verzögerung (und dem Mindest-Abstand) automatisch angeschrieben – ohne Cron. Bereits bekannte Adressen werden übersprungen.</p>
          {[["Adresse", INGEST_URL], ["Ein Lead (JSON)", EXAMPLE_ONE], ["Mehrere Leads, max. 100 (JSON)", EXAMPLE_MANY], ["Beispielaufruf", INGEST_CURL], ["Antworten", RESPONSE]].map(([l, v]) => (
            <div key={l} className="mt-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{l}</div>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-secondary p-3 text-xs">{v}</pre>
                <Button size="icon" variant="secondary" title="Kopieren" onClick={() => copy(v!)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">Pflicht ist nur <code>email</code>; <code>first_name</code>, <code>last_name</code>, <code>source</code> sind optional und füllen {"{first_name}"}, {"{last_name}"}, {"{anrede}"} in der Vorlage. Content-Type: application/json. Funktioniert erst nach dem Veröffentlichen. Verzögerungen bis ca. 15 Minuten laufen von selbst; längere werden gesendet, sobald das Panel offen ist oder der externe Takt läuft. Testen: unter <Link to="/admin/leads" className="text-primary underline">Leads</Link> → „Schnittstelle testen“.</p>
        </Box>
        <Box title="Externer Takt (optional)">
          <p className="text-sm text-muted-foreground">Nicht nötig für Leads. Nur für Kampagnen ohne geöffnetes Panel oder Lead-Verzögerungen über 15 Minuten – z. B. cron-job.org: jede Minute, Methode POST, Header <code>x-cron-secret</code> mit dem Wert von CRON_SECRET.</p>
          <div className="mt-3 flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-secondary p-3 text-xs">{CURL}</pre>
            <Button size="icon" variant="secondary" title="Kopieren" onClick={() => copy(CURL)}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Funktioniert erst nach dem Veröffentlichen. Der Schlüssel gehört in den Header, nicht in die Adresse – Adressen landen in Logs.</p>
        </Box>
        <Box title="Hilfe: Anmeldung klappt nicht?">
          <p className="text-sm text-muted-foreground">Im Supabase-Dashboard unter Authentication → Sign In / Providers → Email die E-Mail-Anmeldung aktivieren. Für schnelle Tests ggf. „Confirm email“ ausschalten, sonst muss die Bestätigungs-Mail zuerst angeklickt werden.</p>
        </Box>
      </div>
    </>
  );
}
