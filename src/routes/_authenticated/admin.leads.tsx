import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, PageHeader, StatusBadge, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/leads")({ component: Leads });

function Leads() {
  const { data = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, email, first_name, last_name, source, status, created_at").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <PageHeader title="Leads" />
      <DataTable
        head={["E-Mail", "Name", "Quelle", "Status", "Erstellt"]}
        empty="Noch keine Leads."
        rows={data.map((l) => [l.email, [l.first_name, l.last_name].filter(Boolean).join(" ") || "–", l.source ?? "–", <StatusBadge key="s" value={l.status} />, fmtDate(l.created_at)])}
      />
    </>
  );
}
