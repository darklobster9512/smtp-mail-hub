import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { saveProxy } from "@/lib/proxies.functions";
import { detectProxyProtocol, parseProxyUrl } from "@/lib/proxy-url";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ProxyRow = {
  id: string; label: string; masked_url: string; protocol: string; country: string | null; status: string;
  usage_count: number; last_used_at: string | null; error_count: number;
};

export function ProxyDialog({ open, onOpenChange, proxy, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; proxy: ProxyRow | null; onSaved: () => void }) {
  const save = useServerFn(saveProxy);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) { setLabel(proxy?.label ?? ""); setUrl(""); setCountry(proxy?.country ?? ""); setError(null); }
  }, [open, proxy]);

  const protocol = detectProxyProtocol(url);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!label.trim()) return setError("Bitte eine Bezeichnung eingeben.");
    if (!proxy && !url.trim()) return setError("Bitte die Proxy-URL eingeben.");
    if (url.trim()) { try { parseProxyUrl(url.trim()); } catch (err) { return setError(err instanceof Error ? err.message : "Ungültige URL"); } }
    setBusy(true);
    try {
      await save({ data: { ...(proxy ? { id: proxy.id } : {}), label: label.trim(), proxy_url: url.trim(), country: country.trim() || null } });
      toast.success(proxy ? "Proxy gespeichert" : "Proxy hinzugefügt");
      onSaved(); onOpenChange(false);
    } catch (err) { notifyError(err, "Speichern fehlgeschlagen"); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{proxy ? "Proxy bearbeiten" : "Proxy hinzufügen"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="p-label">Bezeichnung</Label><Input id="p-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Mobilfunk DE 1" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="p-url">Proxy-URL</Label>
            <Input id="p-url" type="password" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={proxy ? `${proxy.masked_url} (leer lassen = unverändert)` : "socks5://benutzer:passwort@host:1080"} />
            <p className="text-xs text-muted-foreground">
              {protocol ? `Erkanntes Protokoll: ${protocol === "socks5" ? "SOCKS5" : "HTTP"}` : "http://… oder socks5://… inklusive Zugangsdaten. Die URL wird nach dem Speichern nicht mehr angezeigt."}
            </p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="p-country">Land (optional)</Label><Input id="p-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="DE" /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Speichere…" : "Speichern"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
