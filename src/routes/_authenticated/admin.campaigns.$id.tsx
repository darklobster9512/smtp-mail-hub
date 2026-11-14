import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { abortCampaign, retryFailed, runCampaignTick } from "@/lib/campaigns.functions";
import { Button } from "@/components/ui/button";
import { DataTable, PageHeader, StatusBadge, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/campaigns/$id")({ component: Detail });

const PAGE = 50;
const FILTERS = ["all", "pending", "sent", "failed"] as const;

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const tick = useServerFn(runCampaignTick);
  const retry = useServerFn(retryFailed);
  const abort = useServerFn(abortCampaign);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const running = useRef(false);

  const { data: camp } = useQuery({
    queryKey: ["campaign", id],
    refetchInterval: (q) => (q.state.data?.status === "sending" ? 3000 : false),
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: recips } = useQuery({
    queryKey: ["campaign-recipients", id, page, filter],
    placeholderData: keepPreviousData,
    refetchInterval: camp?.status === "sending" ? 4000 : false,
    queryFn: async () => {
      let q = supabase.from("campaign_recipients").select("id, email, first_name, last_name, status, error, sent_at, smtp_account_used", { count: "exact" })
        .eq("campaign_id", id).order("created_at", { ascending: true }).order("id").range(page * PAGE, page * PAGE + PAGE - 1);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["smtp-accounts-names"],
    queryFn: async () => {
      const { data } = await supabase.from("smtp_accounts").select("id, label, host");
      return data ?? [];
    },
  });

  // While this page is open, drive the sender: one step at a time (a global lock prevents overlap).
  const sending = camp?.status === "sending";
  useEffect(() => {
    if (!sending) return;
    let cancelled = false;
    (async () => {
      while (!cancelled) {
        if (running.current) { await new Promise((r) => setTimeout(r, 2000)); continue; }
        running.current = true;
        try {
          const res = await tick();
          qc.invalidateQueries({ queryKey: ["campaign", id] });
          qc.invalidateQueries({ queryKey: ["campaign-recipients", id] });
          if (!res.ran || (res.sent === 0 && res.failed === 0)) await new Promise((r) => setTimeout(r, 5000));
        } catch (e) {
          notifyError(e, "Versand-Schritt fehlgeschlagen");
          await new Promise((r) => setTimeout(r, 10000));
        } finally { running.current = false; }
      }
    })();
    return () => { cancelled = true; };
  }, [sending, id, qc, tick]);

  if (!camp) return <p className="text-muted-foreground">Lade…</p>;
  const pending = Math.max(0, camp.total - camp.sent - camp.failed);
  const pct = camp.total ? Math.round(((camp.sent + camp.failed) / camp.total) * 100) : 0;
  const pages = Math.max(1, Math.ceil((recips?.count ?? 0) / PAGE));
  const accName = (aid: string | null) => { const a = accounts.find((x) => x.id === aid); return a ? a.label || a.host || "Resend" : "–"; };
  const refresh = () => { qc.invalidateQueries({ queryKey: ["campaign", id] }); qc.invalidateQueries({ queryKey: ["campaign-recipients", id] }); };

  async function doRetry() {
    const r = await retry({ data: { campaign_id: id } });
    if (!r.ok) notifyError(r.error); else { toast.success("Versand wird fortgesetzt"); refresh(); }
  }
  async function doAbort() {
    const r = await abort({ data: { campaign_id: id } });
    if (!r.ok) notifyError(r.error); else { toast.success("Versand abgebrochen"); refresh(); }
  }

  const stats = [["Gesamt", camp.total], ["Gesendet", camp.sent], ["Fehlgeschlagen", camp.failed], ["Ausstehend", pending]] as const;

  return (
    <>
      <Link to="/admin/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Kampagnen</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={camp.name} description={camp.subject ?? undefined} />
        <div className="flex items-center gap-2">
          <StatusBadge value={camp.status} />
          {sending && <Button size="sm" variant="secondary" onClick={doAbort}><Square className="h-4 w-4" /> Abbrechen</Button>}
          {!sending && camp.status !== "draft" && (camp.failed > 0 || pending > 0) && (
            <Button size="sm" onClick={doRetry}><RefreshCw className="h-4 w-4" /> {camp.failed > 0 ? "Fehlgeschlagene neu versenden" : "Fortsetzen"}</Button>
          )}
        </div>
      </div>
      {camp.last_error && <p className="mb-4 rounded-md border border-chart-4/40 bg-chart-4/10 p-3 text-sm text-chart-4">{camp.last_error}</p>}
      <div className="mb-4 grid gap-4 sm:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{l}</div>
            <div className={`mt-2 text-3xl font-semibold ${l === "Fehlgeschlagen" && v > 0 ? "text-destructive" : ""}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className="mb-8 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="mr-auto font-semibold">Empfänger</h2>
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => { setFilter(f); setPage(0); }}>
            {f === "all" ? "Alle" : f}
          </Button>
        ))}
      </div>
      <DataTable
        head={["E-Mail", "Name", "Status", "Konto", "Zeit", "Fehler"]}
        empty="Keine Empfänger."
        rows={(recips?.rows ?? []).map((r) => [
          r.email, [r.first_name, r.last_name].filter(Boolean).join(" ") || "–", <StatusBadge key="s" value={r.status} />,
          accName(r.smtp_account_used), fmtDate(r.sent_at), <span key="e" className="text-xs text-destructive">{r.error ?? ""}</span>,
        ])}
      />
      <div className="mt-4 flex items-center justify-end gap-3 text-sm text-muted-foreground">
        <span>Seite {page + 1} von {pages} · {recips?.count ?? 0} Empfänger</span>
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Zurück</Button>
        <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Weiter</Button>
      </div>
    </>
  );
}
