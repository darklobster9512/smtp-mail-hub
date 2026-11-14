import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/automation")({ component: Automation });

function Automation() {
  const { data } = useQuery({
    queryKey: ["leads-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const rows = data
    ? [
        ["Auto-Kampagne", data.auto_campaign_enabled ? "Aktiv" : "Inaktiv"],
        ["Vorlage", data.template_key],
        ["Verzögerung", `${data.delay_seconds} s`],
        ["Mindestabstand", `${data.min_gap_seconds} s`],
      ]
    : [];
  return (
    <>
      <PageHeader title="Automatisierung" description="Einstellungen für den automatischen Lead-Versand." />
      <div className="max-w-lg divide-y divide-border rounded-xl border border-border bg-card">
        {rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">Keine Einstellungen gefunden.</p>}
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-5 py-4 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className={v === "Aktiv" ? "font-medium text-primary" : "font-medium"}>{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}
