import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui";
import { CampaignEditor } from "@/components/admin/campaigns/CampaignEditor";

export const Route = createFileRoute("/_authenticated/admin/campaigns/new")({
  component: () => (
    <>
      <PageHeader title="Neue Kampagne" />
      <CampaignEditor />
    </>
  ),
});
