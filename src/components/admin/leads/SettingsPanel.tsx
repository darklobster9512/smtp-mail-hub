import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/components/admin/ui";
import { sendDueLeadsNow } from "@/lib/leads.functions";

export function useLeadsSettings() {
  return useQuery({
    queryKey: ["leads-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }

export function SettingsPanel() {
  const qc = useQueryClient();
  const { data: s } = useLeadsSettings();
  const sendNow = useServerFn(sendDueLeadsNow);
  const [form, setForm] = useState({ auto: false, delay: 30, gap: 15, tpl: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (s) setForm({ auto: s.auto_campaign_enabled, delay: s.delay_seconds, gap: s.min_gap_seconds, tpl: s.template_key }); }, [s]);

  const { data: drafts = [] } = useQuery({
    queryKey: ["draft-campaigns"],
    queryFn: async () => (await supabase.from("campaigns").select("id, name").eq("status", "draft").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: stats } = useQuery({
    queryKey: ["leads-stats"],
    refetchInterval: 15000,
    queryFn: async () => {
      const [all, sentToday, sched, next] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", startOfDay()),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("leads").select("scheduled_at").eq("status", "scheduled").order("scheduled_at").limit(1).maybeSingle(),
      ]);
      return { all: all.count ?? 0, sentToday: sentToday.count ?? 0, scheduled: sched.count ?? 0, next: next.data?.scheduled_at ?? null };
    },
  });

  async function save() {
    const { error } = await supabase.from("leads_settings").update({
      auto_campaign_enabled: form.auto, delay_seconds: Math.max(0, form.delay), min_gap_seconds: Math.max(0, form.gap), template_key: form.tpl,
    }).eq("id", 1);
    if (error) notifyError(error); else { toast.success("Einstellungen gespeichert"); qc.invalidateQueries({ queryKey: ["leads-settings"] }); }
  }
  async function runNow() {
    setBusy(true);
    try {
      const r = await sendNow();
      if (!r.ran) toast.info("Versand läuft bereits – bitte gleich erneut versuchen.");
      else toast.success(`${r.sent} gesendet, ${r.failed} fehlgeschlagen${r.reason === "gap" ? " (Mindest-Abstand – Rest folgt)" : r.reason === "no-account" ? " (kein Konto frei)" : ""}`);
      qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["leads-stats"] });
    } catch (e) { notifyError(e, "Fehler"); }
    setBusy(false);
  }

  const stat = (l: string, v: string | number) => (
    <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 text-lg font-semibold">{v}</div></div>
  );

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="auto" className="text-base">Automatischer Kampagnenversand bei neuem Lead</Label>
          <p className="text-sm text-muted-foreground">Neue Leads werden eingeplant und automatisch angeschrieben.</p>
        </div>
        <Switch id="auto" checked={form.auto} onCheckedChange={(v) => setForm({ ...form, auto: v })} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div><Label>Verzögerung (Sekunden)</Label><Input type="number" min={0} value={form.delay} onChange={(e) => setForm({ ...form, delay: Number(e.target.value) })} /></div>
        <div><Label>Mindest-Abstand (Sekunden)</Label><Input type="number" min={0} value={form.gap} onChange={(e) => setForm({ ...form, gap: Number(e.target.value) })} /></div>
        <div>
          <Label>Standard-Vorlage</Label>
          <Select value={form.tpl} onValueChange={(v) => setForm({ ...form, tpl: v })}>
            <SelectTrigger><SelectValue placeholder={drafts.length ? "Entwurf wählen" : "Keine Entwürfe vorhanden"} /></SelectTrigger>
            <SelectContent>{drafts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={save}>Speichern</Button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {stat("Leads gesamt", stats?.all ?? "–")}
        {stat("Auto-Mails heute", stats?.sentToday ?? "–")}
        {stat("Geplant", stats?.scheduled ?? "–")}
        {stat("Nächster Versand", stats?.next ? fmtDate(stats.next) : "–")}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" disabled={busy} onClick={runNow}><Send className="h-4 w-4" /> {busy ? "Sende…" : "Jetzt alle offenen senden"}</Button>
      </div>
    </div>
  );
}
