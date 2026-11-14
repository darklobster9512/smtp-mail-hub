import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { startCampaign } from "@/lib/campaigns.functions";
import { parseRecipients } from "@/lib/campaign-parse";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

export function SendDialog({ campaign, onClose }: { campaign: { id: string; name: string } | null; onClose: () => void }) {
  const navigate = useNavigate();
  const start = useServerFn(startCampaign);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["smtp-accounts-active"],
    enabled: !!campaign,
    queryFn: async () => {
      const { data, error } = await supabase.from("smtp_accounts").select("id, label, host, sent_today, sent_date, daily_limit").eq("status", "active").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const parsed = useMemo(() => parseRecipients(text), [text]);
  const canStart = parsed.valid.length > 0 && selected.length > 0;

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function go() {
    if (!campaign) return;
    setConfirm(false);
    setBusy(true);
    try {
      const res = await start({ data: { campaign_id: campaign.id, recipients_text: text, account_ids: selected } });
      if (!res.ok) { notifyError(res.error); return; }
      toast.success(`Versand gestartet: ${res.total} Empfänger`);
      onClose();
      navigate({ to: "/admin/campaigns/$id", params: { id: res.campaign_id } });
    } catch (e) {
      notifyError(e, "Start fehlgeschlagen");
    } finally { setBusy(false); }
  }

  return (
    <>
      <Dialog open={!!campaign} onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Versand starten: {campaign?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label htmlFor="recipients" className="text-sm font-medium">Empfänger</label>
            <Textarea id="recipients" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs"
              placeholder={"max@example.com;Max;Mustermann;Sehr geehrter Herr Mustermann\nanna@example.com"} />
            <p className="text-xs text-muted-foreground">Eine Zeile pro Adresse. Format: <code>email;Vorname;Nachname;Anrede</code> – alles nach der E-Mail ist optional.</p>
            <p className="text-sm"><span className="font-medium text-primary">{parsed.valid.length} gültig</span>
              {parsed.duplicates > 0 && <span className="text-muted-foreground"> · {parsed.duplicates} Duplikate</span>}
              {parsed.invalid.length > 0 && <span className="text-destructive"> · {parsed.invalid.length} ungültig</span>}</p>
            {parsed.invalid.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Diese Zeilen werden übersprungen:</div>
                <ul className="max-h-24 overflow-y-auto font-mono">
                  {parsed.invalid.slice(0, 50).map((i) => <li key={i.line}>Zeile {i.line}: {i.text}</li>)}
                  {parsed.invalid.length > 50 && <li>… und {parsed.invalid.length - 50} weitere</li>}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">SMTP-Konten (aktive)</div>
            {accounts.length === 0 && <p className="text-sm text-muted-foreground">Keine aktiven Konten. Lege zuerst unter „E-Mail-Konten“ eines an.</p>}
            <div className="space-y-2">
              {accounts.map((a) => {
                const used = a.sent_date === today() ? a.sent_today : 0;
                return (
                  <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggle(a.id)} />
                    <span className="font-medium">{a.label || a.host}</span>
                    <span className="ml-auto rounded-md bg-secondary px-2 py-0.5 text-xs">heute {used} / {a.daily_limit}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={busy}>Abbrechen</Button>
            <Button disabled={!canStart || busy} onClick={() => setConfirm(true)}>{busy ? "Starte…" : "Versand starten"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Versand wirklich starten?</AlertDialogTitle>
            <AlertDialogDescription>{parsed.valid.length} Empfänger über {selected.length} Konto/Konten. Höchstens 1 Mail pro Sekunde; du kannst den Versand jederzeit abbrechen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zurück</AlertDialogCancel>
            <AlertDialogAction onClick={go}>Jetzt senden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
