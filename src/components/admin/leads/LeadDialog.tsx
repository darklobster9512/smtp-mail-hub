import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createLead } from "@/lib/leads.functions";
import { EMAIL_RE } from "@/lib/leads-schema";

const SOURCES = ["manuell", "Website", "Telefon", "Messe", "Empfehlung", "api"];

export function LeadDialog({ open, onOpenChange, autoDefault, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; autoDefault: boolean; onSaved: () => void }) {
  const create = useServerFn(createLead);
  const [f, setF] = useState({ email: "", first_name: "", last_name: "", source: "manuell", auto: autoDefault });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF({ email: "", first_name: "", last_name: "", source: "manuell", auto: autoDefault }); }, [open, autoDefault]);
  const emailOk = EMAIL_RE.test(f.email.trim());

  async function submit() {
    if (!emailOk) return;
    setBusy(true);
    try {
      const r = await create({ data: f });
      if (!r.ok) notifyError(r.error); else { toast.success(f.auto ? "Lead angelegt und eingeplant" : "Lead angelegt"); onSaved(); onOpenChange(false); }
    } catch (e) { notifyError(e, "Fehler"); }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Lead hinzufügen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>E-Mail *</Label>
            <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            {f.email && !emailOk && <p className="mt-1 text-xs text-destructive">Ungültige E-Mail-Adresse</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vorname</Label><Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
            <div><Label>Nachname</Label><Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
          </div>
          <div>
            <Label>Quelle</Label>
            <Input list="lead-sources" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
            <datalist id="lead-sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={f.auto} onCheckedChange={(v) => setF({ ...f, auto: v === true })} /> Auto-Kampagne auslösen
          </label>
        </div>
        <DialogFooter><Button disabled={!emailOk || busy} onClick={submit}>{busy ? "Speichere…" : "Anlegen"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
