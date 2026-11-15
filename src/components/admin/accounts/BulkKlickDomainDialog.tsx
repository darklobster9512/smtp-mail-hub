import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/notify";
import { distributeLinks, parseLinks } from "@/lib/klick-distribute";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Row = { id: string; label: string | null; host: string | null; from_email: string | null; klick_domain: string | null };

export function BulkKlickDomainDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["smtp-accounts-klick"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("smtp_accounts").select("id, label, host, from_email, klick_domain").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  useEffect(() => { if (open) { setSelected(new Set()); setText(""); } }, [open]);

  const { links, invalid } = useMemo(() => parseLinks(text), [text]);
  const n = selected.size;
  const base = links.length ? Math.floor(n / links.length) : 0;
  const extra = links.length ? n % links.length : 0;
  const allSel = accounts.length > 0 && selected.size === accounts.length;
  const toggle = (id: string) => setSelected((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });

  async function apply() {
    const groups = distributeLinks([...selected], links);
    setSaving(true);
    try {
      for (const [link, ids] of groups) {
        const { error } = await supabase.from("smtp_accounts").update({ klick_domain: link }).in("id", ids);
        if (error) throw error;
      }
      toast.success(`${n} Konten auf ${Math.min(links.length, n)} Links verteilt`);
      onSaved();
      onOpenChange(false);
    } catch (e) { notifyError(e); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Klick-Domains verteilen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Konten ({n} ausgewählt)</span>
              <Button size="sm" variant="ghost" onClick={() => setSelected(allSel ? new Set() : new Set(accounts.map((a) => a.id)))}>
                {allSel ? "Keine auswählen" : "Alle auswählen"}
              </Button>
            </div>
            <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {accounts.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-row-hover">
                  <Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                  <span className="min-w-0 flex-1 truncate font-medium">{a.label || a.from_email || a.host || "Konto"}</span>
                  <span className="truncate text-xs text-muted-foreground">{a.klick_domain || "–"}</span>
                </label>
              ))}
              {!accounts.length && <p className="px-3 py-4 text-sm text-muted-foreground">Keine Konten.</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Links (jede Zeile = 1 Link)</p>
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"https://link-eins.de\nhttps://link-zwei.de"} className="font-mono text-xs" />
            {invalid.length > 0 && (
              <p className="mt-1 text-xs text-destructive">Ungültig (werden ignoriert): {invalid.join(", ")}</p>
            )}
          </div>
          {links.length > 0 && n > 0 && (
            <p className="text-sm text-muted-foreground">
              {links.length} Links · {n} Konten → je {base}{extra ? ` (${extra} Links bekommen ${base + 1})` : ""} Konten pro Link, zufällig verteilt.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button disabled={!n || !links.length || saving} onClick={apply}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Übernehmen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
