import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, PageHeader, fmtDate } from "@/components/admin/ui";
import { SettingsPanel, useLeadsSettings } from "@/components/admin/leads/SettingsPanel";
import { LeadDialog } from "@/components/admin/leads/LeadDialog";
import { testIngest } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({ meta: [{ title: "Leads – Postwerk Admin" }, { name: "description", content: "Leads verwalten und automatisch per E-Mail anschreiben." }, { property: "og:title", content: "Leads – Postwerk Admin" }, { property: "og:description", content: "Leads verwalten und automatisch per E-Mail anschreiben." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Leads,
});

const PAGE = 25;
type Range = "24h" | "week" | "all";

function LeadStatus({ status, at, account }: { status: string; at: string | null; account: string | null }) {
  const map: Record<string, [string, string]> = {
    new: ["neu", "bg-secondary text-muted-foreground"],
    scheduled: ["geplant", "bg-chart-4/15 text-chart-4"],
    sent: ["gesendet", "bg-primary/15 text-primary"],
    failed: ["fehlgeschlagen", "bg-destructive/15 text-destructive"],
  };
  const [label, cls] = map[status] ?? [status, "bg-secondary text-muted-foreground"];
  const extra = status === "scheduled" && at ? ` · ${new Date(at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}` : status === "sent" && account ? ` · ${account}` : "";
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}{extra}</span>;
}

function Leads() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [range, setRange] = useState<Range>("all");
  const [open, setOpen] = useState(false);
  const { data: settings } = useLeadsSettings();
  const test = useServerFn(testIngest);
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState<{ status: number; body: string } | null>(null);
  async function runTest() {
    setTesting(true);
    try { setTestRes(await test()); } catch (e) { setTestRes({ status: 0, body: e instanceof Error ? e.message : String(e) }); }
    setTesting(false);
  }

  const { data } = useQuery({
    queryKey: ["leads", page, range],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("leads").select("id, email, first_name, last_name, source, status, scheduled_at, created_at, error, smtp_accounts(label, host)", { count: "exact" });
      if (range !== "all") q = q.gte("created_at", new Date(Date.now() - (range === "24h" ? 86400e3 : 7 * 86400e3)).toISOString());
      const { data, count, error } = await q.order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  // Live updates via Supabase Realtime
  useEffect(() => {
    const ch = supabase.channel("leads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (p) => {
        qc.invalidateQueries({ queryKey: ["leads"] });
        qc.invalidateQueries({ queryKey: ["leads-stats"] });
        if (p.eventType === "INSERT") toast(`Neuer Lead: ${(p.new as { email?: string }).email ?? ""}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const rows = data?.rows ?? [];
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => { setSel(new Set()); }, [page, range]);
  async function del(ids: string[]) {
    if (!ids.length || !confirm(`${ids.length} Lead${ids.length > 1 ? "s" : ""} endgültig löschen?`)) return;
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) { toast.error(`Löschen fehlgeschlagen: ${error.message}`); return; }
    toast.success(`${ids.length} Lead${ids.length > 1 ? "s" : ""} gelöscht`);
    setSel(new Set()); refresh();
  }
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["leads-stats"] }); };

  return (
    <>
      <PageHeader title="Leads" description="Leads verwalten und automatisch anschreiben." />
      <SettingsPanel />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={range} onValueChange={(v) => { setRange(v as Range); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Letzte 24 Stunden</SelectItem>
            <SelectItem value="week">Letzte Woche</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          {sel.size > 0 && <Button variant="destructive" onClick={() => del([...sel])}><Trash2 className="h-4 w-4" /> Ausgewählte löschen ({sel.size})</Button>}
          <Button variant="secondary" disabled={testing} onClick={runTest}>{testing ? "Teste…" : "Schnittstelle testen"}</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Lead hinzufügen</Button>
        </div>
      </div>
      {testRes && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${testRes.status === 201 ? "border-primary/40" : "border-destructive/40"}`}>
          <div className="font-medium">
            {testRes.status === 201 ? "✓ Schnittstelle läuft (201) – Test-Lead wurde angelegt und wieder entfernt."
                           : `✗ Status ${testRes.status || "keine Verbindung"}`}
          </div>
          {testRes.status !== 201 && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{testRes.body}</pre>}
        </div>
      )}
      <DataTable
        head={[<input key="a" type="checkbox" aria-label="Alle auswählen" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} />, "E-Mail", "Vorname", "Nachname", "Quelle", "Status", "Erstellt", ""]}
        empty="Keine Leads im gewählten Zeitraum."
        rows={rows.map((l) => {
          const acc = l.smtp_accounts as { label: string | null; host: string | null } | null;
          return [
            <input key="c" type="checkbox" aria-label="Auswählen" checked={sel.has(l.id)} onChange={() => toggle(l.id)} />,
            <span key="e" className="font-medium" title={l.error ?? undefined}>{l.email}</span>,
            l.first_name ?? "–", l.last_name ?? "–", l.source ?? "–",
            <LeadStatus key="s" status={l.status} at={l.scheduled_at} account={acc ? acc.label || acc.host || "Resend" : null} />,
            fmtDate(l.created_at),
            <Button key="d" size="icon" variant="ghost" aria-label="Lead löschen" onClick={() => del([l.id])}><Trash2 className="h-4 w-4 text-destructive" /></Button>,
          ];
        })}
      />
      <div className="mt-4 flex items-center justify-end gap-3 text-sm text-muted-foreground">
        <span>Seite {page + 1} von {pages} · {data?.count ?? 0} Leads</span>
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Zurück</Button>
        <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Weiter</Button>
      </div>
      <LeadDialog open={open} onOpenChange={setOpen} autoDefault={settings?.auto_campaign_enabled ?? false} onSaved={refresh} />
    </>
  );
}
