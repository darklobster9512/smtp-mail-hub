import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, PageHeader, StatusBadge } from "@/components/admin/ui";
import { SendDialog } from "@/components/admin/campaigns/SendDialog";

export const Route = createFileRoute("/_authenticated/admin/campaigns/")({
  head: () => ({ meta: [{ title: "Kampagnen – Postwerk Admin" }, { name: "description", content: "E-Mail-Kampagnen anlegen, starten und auswerten." }, { property: "og:title", content: "Kampagnen – Postwerk Admin" }, { property: "og:description", content: "E-Mail-Kampagnen anlegen, starten und auswerten." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Campaigns });

function Campaigns() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sendFor, setSendFor] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["campaigns"],
    refetchInterval: (q) => (q.state.data?.some((c) => c.status === "sending") ? 5000 : false),
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("id, name, subject, status, total, sent, failed, created_at").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  async function duplicate(id: string) {
    const { data: c, error } = await supabase.from("campaigns").select("name, subject, html_content").eq("id", id).single();
    if (error) { notifyError(error); return; }
    const { error: e2 } = await supabase.from("campaigns").insert({ name: `${c.name} (Kopie)`, subject: c.subject, html_content: c.html_content });
    if (e2) notifyError(e2); else { toast.success("Kampagne dupliziert"); qc.invalidateQueries({ queryKey: ["campaigns"] }); }
  }

  async function remove() {
    if (!deleting) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", deleting.id);
    if (error) notifyError(error); else { toast.success("Kampagne gelöscht"); qc.invalidateQueries({ queryKey: ["campaigns"] }); }
    setDeleting(null);
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Kampagnen" />
        <Button onClick={() => navigate({ to: "/admin/campaigns/new" })}><Plus className="h-4 w-4" /> Neue Kampagne</Button>
      </div>
      <DataTable
        head={["Name", "Betreff", "Status", "Gesendet", "Fehler", ""]}
        empty="Noch keine Kampagnen."
        rows={data.map((c) => [
          <Link key="n" to="/admin/campaigns/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.name}</Link>,
          c.subject ?? "–",
          <StatusBadge key="s" value={c.status} />,
          `${c.sent} / ${c.total}`,
          c.failed > 0 ? <span key="f" className="text-destructive">{c.failed}</span> : 0,
          <div key="a" className="flex justify-end gap-1">
            {c.status === "draft" && <Button size="icon" variant="ghost" title="Starten" onClick={() => setSendFor({ id: c.id, name: c.name })}><Play className="h-4 w-4 text-primary" /></Button>}
            <Button size="icon" variant="ghost" title="Bearbeiten" disabled={c.status === "sending"} onClick={() => navigate({ to: "/admin/campaigns/$id/edit", params: { id: c.id } })}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Duplizieren" onClick={() => duplicate(c.id)}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Löschen" disabled={c.status === "sending"} onClick={() => setDeleting({ id: c.id, name: c.name })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>,
        ])}
      />
      <SendDialog campaign={sendFor} onClose={() => setSendFor(null)} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kampagne löschen?</AlertDialogTitle>
            <AlertDialogDescription>„{deleting?.name}“ und alle zugehörigen Empfänger werden dauerhaft entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
