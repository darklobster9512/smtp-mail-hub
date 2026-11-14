import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseSmtpLines } from "@/lib/smtp-import";
import { notifyError, notifySuccess } from "@/lib/notify";

export function BulkImportDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [fromName, setFromName] = useState("");
  const [klick, setKlick] = useState("");
  const [limit, setLimit] = useState(1500);
  const [busy, setBusy] = useState(false);
  const { data: existing = [] } = useQuery({
    queryKey: ["smtp-existing"], enabled: open,
    queryFn: async () => ((await supabase.from("smtp_accounts").select("host, user_email").eq("provider", "smtp")).data ?? []).map((r) => ({ host: r.host ?? "", user_email: r.user_email ?? "" })),
  });
  const parsed = useMemo(() => parseSmtpLines(text, existing), [text, existing]);

  async function submit() {
    if (parsed.valid.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("smtp_accounts").insert(parsed.valid.map((r) => ({
      ...r, label: r.user_email, from_email: r.user_email, from_name: fromName || null, klick_domain: klick || null, daily_limit: Math.max(1, limit),
    })));
    setBusy(false);
    if (error) { notifyError(error, "Import fehlgeschlagen"); return; }
    notifySuccess(`${parsed.valid.length} Konten angelegt`, parsed.duplicates || parsed.invalid.length ? `${parsed.duplicates} doppelt, ${parsed.invalid.length} fehlerhaft übersprungen` : undefined);
    setText(""); onSaved(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk-Import</DialogTitle>
          <DialogDescription>Eine Zeile pro Konto: <code>host:port:user:passwort</code> oder <code>host;port;user;passwort</code></DialogDescription>
        </DialogHeader>
        <Textarea rows={8} className="font-mono text-xs" placeholder={"smtp.beispiel.de:587:info@beispiel.de:passwort\nmail.firma.de;465;news@firma.de;passwort"} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Absendername</Label><Input value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
          <div><Label>Klick-Domain</Label><Input placeholder="link.beispiel.de" value={klick} onChange={(e) => setKlick(e.target.value)} /></div>
          <div><Label>Tageslimit</Label><Input type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></div>
        </div>
        {text.trim() && (
          <div className="rounded-lg border border-border p-3 text-sm">
            <span className="font-medium text-primary">{parsed.valid.length} gültig</span>
            {" · "}<span className={parsed.invalid.length ? "text-destructive" : ""}>{parsed.invalid.length} fehlerhaft</span>
            {" · "}{parsed.duplicates} doppelt
            {parsed.invalid.length > 0 && (
              <ul className="mt-2 max-h-24 overflow-y-auto text-xs text-destructive">
                {parsed.invalid.slice(0, 20).map((x) => <li key={x.line}>Zeile {x.line}: {x.reason}</li>)}
              </ul>
            )}
          </div>
        )}
        <DialogFooter><Button disabled={busy || parsed.valid.length === 0} onClick={submit}>{busy ? "Lege an…" : `${parsed.valid.length} Konten anlegen`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
