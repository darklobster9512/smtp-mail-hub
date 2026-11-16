import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Globe, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { deleteProxy, getProxies, saveProxySettings, setProxyStatus, testProxy } from "@/lib/proxies.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, PageHeader, StatusBadge, fmtDate } from "@/components/admin/ui";
import { ProxyDialog, type ProxyRow } from "@/components/admin/proxies/ProxyDialog";

export const Route = createFileRoute("/_authenticated/admin/proxies")({
  head: () => ({ meta: [{ title: "Proxys – Postwerk Admin" }, { name: "description", content: "Proxy-Pool für den SMTP-Versand verwalten." }, { property: "og:title", content: "Proxys – Postwerk Admin" }, { property: "og:description", content: "Proxy-Pool für den SMTP-Versand verwalten." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Proxies,
});

function Proxies() {
  const qc = useQueryClient();
  const load = useServerFn(getProxies);
  const saveSettings = useServerFn(saveProxySettings);
  const setStatus = useServerFn(setProxyStatus);
  const remove = useServerFn(deleteProxy);
  const test = useServerFn(testProxy);
  const [editing, setEditing] = useState<ProxyRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProxyRow | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["mail-proxies"], queryFn: () => load() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["mail-proxies"] });
  const proxies = (data?.proxies ?? []) as ProxyRow[];
  const settings = data?.settings;
  const activeCount = proxies.filter((p) => p.status === "active").length;

  async function update(enabled: boolean, strategy: "random" | "round_robin") {
    try { await saveSettings({ data: { enabled, strategy } }); toast.success("Einstellungen gespeichert"); refresh(); } catch (e) { notifyError(e); }
  }
  async function runTest(p: ProxyRow) {
    setTesting(p.id);
    try {
      const r = await test({ data: { id: p.id } });
      if (r.ok) toast.success(`Exit-IP: ${r.ip}`, { description: p.label }); else notifyError(r.error, "Proxy-Test fehlgeschlagen");
    } catch (e) { notifyError(e, "Proxy-Test fehlgeschlagen"); } finally { setTesting(null); }
  }
  async function toggle(p: ProxyRow) {
    try { await setStatus({ data: { id: p.id, status: p.status === "active" ? "disabled" : "active" } }); refresh(); } catch (e) { notifyError(e); }
  }
  async function confirmDelete() {
    if (!deleting) return;
    try { await remove({ data: { id: deleting.id } }); toast.success("Proxy gelöscht"); refresh(); } catch (e) { notifyError(e); }
    setDeleting(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-4">
        <PageHeader title="Proxys" description="Mail-Versand über Proxy-Server statt direkt von der Server-IP." />
        <Button className="mb-6" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Proxy hinzufügen</Button>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Switch id="pool" checked={settings?.enabled ?? false} disabled={!settings} onCheckedChange={(v) => update(v, settings?.strategy === "round_robin" ? "round_robin" : "random")} />
            <Label htmlFor="pool">Proxy-Pool aktiv</Label>
          </div>
          <div className="flex items-center gap-3">
            <Label>Strategie</Label>
            <Select value={settings?.strategy === "round_robin" ? "round_robin" : "random"} disabled={!settings} onValueChange={(v) => update(settings?.enabled ?? false, v === "round_robin" ? "round_robin" : "random")}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="random">Zufällig</SelectItem><SelectItem value="round_robin">Round-Robin</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Alle ausgehenden SMTP-Verbindungen laufen über aktive Proxys, wenn der Pool aktiviert ist.</p>
        {settings?.enabled && activeCount === 0 && (
          <p className="mt-2 text-sm text-destructive">Der Pool ist aktiv, aber es gibt keinen aktiven Proxy. Mails werden deshalb direkt versendet.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Ein Proxy wird nach 5 aufeinanderfolgenden Verbindungsfehlern automatisch deaktiviert. Der Exit-IP-Test prüft HTTPS; ob der Anbieter auch SMTP-Ports (465/587) erlaubt, zeigt erst ein echter Versand.</p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">Proxys konnten nicht geladen werden.</p>}
      <DataTable
        head={["Label", "URL", "Protokoll", "Land", "Status", "Nutzungen", "Fehler", "Zuletzt genutzt", ""]}
        empty={isLoading ? "Lade…" : "Noch keine Proxys."}
        rows={proxies.map((p) => [
          <span key="l" className="font-medium">{p.label}</span>,
          <span key="u" className="font-mono text-xs">{p.masked_url}</span>,
          p.protocol === "socks5" ? "SOCKS5" : "HTTP",
          p.country ?? "–",
          <StatusBadge key="s" value={p.status} />,
          p.usage_count,
          <span key="e" className={p.error_count > 0 ? "text-destructive" : ""}>{p.error_count} / 5</span>,
          fmtDate(p.last_used_at),
          <div key="a" className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" title="Exit-IP testen" disabled={testing === p.id} onClick={() => runTest(p)}><Globe className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Bearbeiten" onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title={p.status === "active" ? "Deaktivieren" : "Aktivieren"} onClick={() => toggle(p)}><Power className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Löschen" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>,
        ])}
      />

      <ProxyDialog open={formOpen} onOpenChange={setFormOpen} proxy={editing} onSaved={refresh} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proxy löschen?</AlertDialogTitle>
            <AlertDialogDescription>„{deleting?.label}“ wird dauerhaft entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Löschen</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
