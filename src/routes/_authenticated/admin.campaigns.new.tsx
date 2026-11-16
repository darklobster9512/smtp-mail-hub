import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui";
import { CampaignEditor } from "@/components/admin/campaigns/CampaignEditor";

export const Route = createFileRoute("/_authenticated/admin/campaigns/new")({
  head: () => ({ meta: [{ title: "Neue Kampagne – Postwerk Admin" }, { name: "description", content: "Neue E-Mail-Kampagne mit Empfängern und Vorlage erstellen." }, { property: "og:title", content: "Neue Kampagne – Postwerk Admin" }, { property: "og:description", content: "Neue E-Mail-Kampagne mit Empfängern und Vorlage erstellen." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <>
      <PageHeader title="Neue Kampagne" />
      <CampaignEditor />
    </>
  ),
});
