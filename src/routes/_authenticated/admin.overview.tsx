import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, PageHeader, StatusBadge, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/overview")({ component: Overview });

async function count(table: "smtp_accounts" | "campaigns" | "leads") {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

function Overview() {
  const { data: stats } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: async () => ({
      accounts: await count("smtp_accounts"),
      campaigns: await count("campaigns"),
      leads: await count("leads"),
    }),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["mail-logs-recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mail_logs").select("*").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });
  const cards = [["E-Mail-Konten", stats?.accounts], ["Kampagnen", stats?.campaigns], ["Leads", stats?.leads]] as const;
  return (
    <>
      <PageHeader title="Übersicht" />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{l}</div>
            <div className="mt-2 text-3xl font-semibold">{v ?? "–"}</div>
          </div>
        ))}
      </div>
      <h2 className="mb-3 font-semibold">Letzte Logeinträge</h2>
      <DataTable
        head={["Typ", "Nachricht", "Zeit"]}
        empty="Noch keine Logeinträge."
        rows={logs.map((l) => [<StatusBadge key="t" value={l.type} />, l.message, fmtDate(l.created_at)])}
      />
    </>
  );
}
