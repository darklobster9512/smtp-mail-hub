import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, PageHeader, StatusBadge, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({ component: Campaigns });

function Campaigns() {
  const { data = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("id, name, subject, status, total, sent, failed, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <PageHeader title="Kampagnen" />
      <DataTable
        head={["Name", "Betreff", "Status", "Gesendet", "Fehler", "Erstellt"]}
        empty="Noch keine Kampagnen."
        rows={data.map((c) => [c.name, c.subject ?? "–", <StatusBadge key="s" value={c.status} />, `${c.sent} / ${c.total}`, c.failed, fmtDate(c.created_at)])}
      />
    </>
  );
}
