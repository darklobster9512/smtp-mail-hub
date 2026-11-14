import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, PageHeader, StatusBadge } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/accounts")({ component: Accounts });

function Accounts() {
  const { data = [] } = useQuery({
    queryKey: ["smtp-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smtp_accounts")
        .select("id, label, host, port, user_email, from_email, daily_limit, sent_today, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <PageHeader title="E-Mail-Konten" description="SMTP-Konten für den Versand." />
      <DataTable
        head={["Name", "Host", "Benutzer", "Absender", "Heute / Limit", "Status"]}
        empty="Noch keine E-Mail-Konten."
        rows={data.map((a) => [
          a.label ?? "–", `${a.host}:${a.port}`, a.user_email, a.from_email ?? "–",
          `${a.sent_today} / ${a.daily_limit}`, <StatusBadge key="s" value={a.status} />,
        ])}
      />
    </>
  );
}
