import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendTestMail } from "@/lib/smtp.functions";
import { notifyError } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Row = { id: string; label: string | null; host: string | null; provider: string; from_email: string | null; user_email: string | null };
type Result = { state: "wait" | "sending" | "ok" | "error"; error?: string };

export function BulkTestDialog({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void }) {
  const send = useServerFn(sendTestMail);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [to, setTo] = useState("");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const cancel = useRef(false);

  const { data: accounts = [], refetch } = useQuery({
    queryKey: ["smtp-accounts-all"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("smtp_accounts").select("id, label, host, provider, from_email, user_email").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  useEffect(() => { if (open) { setResults({}); setConfirmDel(false); } }, [open]);

  const valid = EMAIL_RE.test(to.trim());
  const failed = accounts.filter((a) => results[a.id]?.state === "error");
  const ok = accounts.filter((a) => results[a.id]?.state === "ok").length;
  const done = Object.values(results).some((r) => r.state === "ok" || r.state === "error");

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function run() {
    const ids = accounts.filter((a) => selected.has(a.id)).map((a) => a.id);
    if (!ids.length || !valid) return;
    cancel.current = false; setRunning(true); setConfirmDel(false);
    setResults(Object.fromEntries(ids.map((id) => [id, { state: "wait" } as Result])));
    for (let i = 0; i < ids.length; i++) {
      if (cancel.current) break;
      const id = ids[i] as string;
      setResults((r) => ({ ...r, [id]: { state: "sending" } }));
      try {
        const res = await send({ data: { account_id: id, test_email_to: to.trim() } });
        setResults((r) => ({ ...r, [id]: res.success ? { state: "ok" } : { state: "error", error: res.error } }));
      } catch (e) {
        setResults((r) => ({ ...r, [id]: { state: "error", error: e instanceof Error ? e.message : String(e) } }));
      }
      if (i < ids.length - 1) await new Promise((r) => setTimeout(r, 1000));
    }
    setRunning(false);
  }

  async function removeFailed() {
    const ids = failed.map((a) => a.id);
    const { error } = await supabase.from("smtp_accounts").delete().in("id", ids);
    if (error) { notifyError(error); return; }
    toast.success(`${ids.length} fehlerhafte Konten entfernt`);
    setResults((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !ids.includes(k))));
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    setConfirmDel(false); refetch(); onChanged();
  }

  const name = (a: Row) => a.label || a.host || "Resend";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!running) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Bulk-Test</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" placeholder="empfaenger@example.com" value={to} onChange={(e) => setTo(e.target.value)} disabled={running} />
          {running
            ? <Button variant="secondary" onClick={() => { cancel.current = true; }}>Abbrechen</Button>
            : <Button onClick={run} disabled={!valid || selected.size === 0}>Testmails senden ({selected.size})</Button>}
        </div>
        {to && !valid && <p className="text-xs text-destructive">Bitte eine gültige E-Mail-Adresse eingeben.</p>}
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={running} onClick={() => setSelected(new Set(accounts.map((a) => a.id)))}>Alle auswählen</Button>
            <Button size="sm" variant="ghost" disabled={running} onClick={() => setSelected(new Set())}>Keine</Button>
          </div>
          {done && <span className="text-muted-foreground">{ok} erfolgreich · <span className="text-destructive">{failed.length} fehlerhaft</span></span>}
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
          {accounts.length === 0 && <p className="p-4 text-sm text-muted-foreground">Keine Konten vorhanden.</p>}
          {accounts.map((a) => {
            const r = results[a.id];
            return (
              <label key={a.id} className={`flex cursor-pointer items-start gap-3 border-b border-border px-3 py-2 last:border-0 ${r?.state === "error" ? "bg-destructive/10" : r?.state === "ok" ? "bg-primary/5" : ""}`}>
                <Checkbox className="mt-0.5" checked={selected.has(a.id)} disabled={running} onCheckedChange={() => toggle(a.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{name(a)}</span>
                    <span className="text-xs text-muted-foreground">{a.provider === "resend" ? "Resend" : "SMTP"} · {a.from_email ?? a.user_email ?? "–"}</span>
                  </div>
                  {r?.state === "error" && <p className="mt-1 break-words text-xs text-destructive">{r.error}</p>}
                </div>
                <div className="shrink-0 text-xs">
                  {r?.state === "wait" && <span className="text-muted-foreground">wartet</span>}
                  {r?.state === "sending" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {r?.state === "ok" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  {r?.state === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              </label>
            );
          })}
        </div>
        {!running && failed.length > 0 && (
          confirmDel ? (
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
              <span>{failed.length} Konten dauerhaft löschen?</span>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDel(false)}>Abbrechen</Button>
              <Button size="sm" variant="destructive" onClick={removeFailed}>Ja, löschen</Button>
            </div>
          ) : (
            <div className="flex justify-end"><Button variant="destructive" onClick={() => setConfirmDel(true)}>Fehlerhafte entfernen ({failed.length})</Button></div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
