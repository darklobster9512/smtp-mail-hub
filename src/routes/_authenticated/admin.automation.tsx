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
  head: () => ({ meta: [{ title: "Automatisierung – Postwerk Admin" }] }),
  component: Automation,
});

const BASE = "https://project--1304ce56-0e4b-4c22-ad0a-6a07b2dd78c9.lovable.app";
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
            {(["LEADS_INGEST_KEY", "CRON_SECRET"] as const).map((k) => (
              <li key={k} className="flex justify-between">
                <code>{k}</code>
                <span className={secrets?.[k] ? "font-medium text-primary" : "font-medium text-destructive"}>{secrets ? (secrets[k] ? "✓ hinterlegt" : "✗ fehlt") : "…"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Geprüft wird nur, ob ein Wert existiert. Schlüssel anlegen: in Lovable Projektname → Settings → Secrets. Einstellungen für Leads ändern unter <Link to="/admin/leads" className="text-primary underline">Leads</Link>.</p>
        </Box>
        <Box title="Externer Takt">
          <p className="text-sm text-muted-foreground">Solange das Admin-Panel offen ist, sendet es jede Minute selbst. Nur wenn niemand das Panel offen hat, wird ein externer Dienst gebraucht – z. B. cron-job.org: jede Minute, Methode POST, Header <code>x-cron-secret</code> mit dem Wert von CRON_SECRET.</p>
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
