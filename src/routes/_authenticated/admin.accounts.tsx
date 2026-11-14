import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, PageHeader, StatusBadge, fmtDate } from "@/components/admin/ui";
import { AccountDialog, type Account } from "@/components/admin/accounts/AccountDialog";
import { TestMailDialog } from "@/components/admin/accounts/TestMailDialog";

export const Route = createFileRoute("/_authenticated/admin/accounts")({ component: Accounts });

const PAGE = 25;
const COLS = "id, label, host, port, user_email, from_name, from_email, klick_domain, daily_limit, sent_today, status, created_at";

function Accounts() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [testing, setTesting] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);

  const { data } = useQuery({
    queryKey: ["smtp-accounts", page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, count, error } = await supabase.from("smtp_accounts").select(COLS, { count: "exact" })
        .order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      return { rows: data as Account[], count: count ?? 0 };
    },
  });
  const rows = data?.rows ?? [];
  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE));
  const refresh = () => qc.invalidateQueries({ queryKey: ["smtp-accounts"] });

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("smtp_accounts").delete().eq("id", deleting.id);
    if (error) toast.error(error.message); else { toast.success("Konto gelöscht"); refresh(); }
    setDeleting(null);
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="E-Mail-Konten" description="SMTP-Konten für den Versand." />
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Konto hinzufügen</Button>
      </div>
      <DataTable
        head={["Label", "Host:Port", "Absender", "Klick-Domain", "Heute", "Status", "Erstellt", ""]}
        empty="Noch keine E-Mail-Konten."
        rows={rows.map((a) => [
          <span key="l" className="font-medium">{a.label ?? "–"}</span>,
          `${a.host}:${a.port}`,
          a.from_email ?? a.user_email,
          a.klick_domain ?? "–",
          <span key="t" className={`rounded-md px-2 py-0.5 text-xs font-medium ${a.sent_today >= a.daily_limit ? "bg-destructive/15 text-destructive" : "bg-secondary text-foreground"}`}>{a.sent_today} / {a.daily_limit}</span>,
          <StatusBadge key="s" value={a.status} />,
          fmtDate(a.created_at),
          <div key="a" className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" title="Testmail senden" onClick={() => setTesting(a)}><Send className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Bearbeiten" onClick={() => { setEditing(a); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Löschen" onClick={() => setDeleting(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>,
        ])}
      />
      <div className="mt-4 flex items-center justify-end gap-3 text-sm text-muted-foreground">
        <span>Seite {page + 1} von {pages} · {data?.count ?? 0} Konten</span>
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Zurück</Button>
        <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Weiter</Button>
      </div>

      <AccountDialog open={formOpen} onOpenChange={setFormOpen} account={editing} onSaved={refresh} />
      <TestMailDialog account={testing} onClose={() => setTesting(null)} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konto löschen?</AlertDialogTitle>
            <AlertDialogDescription>„{deleting?.label || deleting?.host}“ wird dauerhaft entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
