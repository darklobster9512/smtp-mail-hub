import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/ui";
import { CampaignEditor } from "@/components/admin/campaigns/CampaignEditor";

export const Route = createFileRoute("/_authenticated/admin/campaigns/$id_/edit")({
  head: () => ({ meta: [{ title: "Kampagne bearbeiten – Postwerk Admin" }, { name: "description", content: "Betreff, Inhalt und Empfänger einer Kampagne anpassen." }, { property: "og:title", content: "Kampagne bearbeiten – Postwerk Admin" }, { property: "og:description", content: "Betreff, Inhalt und Empfänger einer Kampagne anpassen." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Edit });

function Edit() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-edit", id],
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("id, name, subject, html_content, status").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <p className="text-muted-foreground">Lade…</p>;
  if (!data) return <p className="text-muted-foreground">Kampagne nicht gefunden. <Link to="/admin/campaigns" className="text-primary">Zurück</Link></p>;
  return (
    <>
      <PageHeader title="Kampagne bearbeiten" description={data.status !== "draft" ? "Änderungen wirken sich nicht auf bereits gesendete Mails aus." : undefined} />
      <CampaignEditor campaign={data} />
    </>
  );
}
