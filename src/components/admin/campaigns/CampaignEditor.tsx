import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PreviewDialog } from "./PreviewDialog";
import { SendDialog } from "./SendDialog";

type Initial = { id: string; name: string; subject: string | null; html_content: string | null };

export function CampaignEditor({ campaign }: { campaign?: Initial }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [html, setHtml] = useState(campaign?.html_content ?? "");
  const [preview, setPreview] = useState(false);
  const [sendFor, setSendFor] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(): Promise<string | null> {
    if (!name.trim()) { toast.error("Bitte einen Namen eingeben."); return null; }
    setBusy(true);
    try {
      const row = { name: name.trim(), subject: subject.trim(), html_content: html };
      if (campaign) {
        const { error } = await supabase.from("campaigns").update(row).eq("id", campaign.id);
        if (error) throw error;
        return campaign.id;
      }
      const { data, error } = await supabase.from("campaigns").insert(row).select("id").single();
      if (error) throw error;
      return data.id;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      return null;
    } finally { setBusy(false); setPreview((p) => p); }
  }

  async function saveDraft() {
    const id = await save();
    if (!id) return;
    toast.success("Entwurf gespeichert");
    qc.invalidateQueries({ queryKey: ["campaigns"] });
    navigate({ to: "/admin/campaigns" });
  }

  async function saveAndSend() {
    if (!subject.trim() || !html.trim()) { toast.error("Betreff und HTML-Inhalt sind für den Versand nötig."); return; }
    const id = await save();
    if (!id) return;
    qc.invalidateQueries({ queryKey: ["campaigns"] });
    setSendFor({ id, name: name.trim() });
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name (intern)</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject">Betreff</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="html">HTML-Inhalt</Label>
        <Textarea id="html" rows={18} value={html} onChange={(e) => setHtml(e.target.value)} className="font-mono text-xs" placeholder="<html>…</html>" />
      </div>
      <div className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1.5 text-muted-foreground">
          <p className="font-medium text-foreground">Platzhalter</p>
          <p><code className="text-primary">{"{klick_domain}"}</code> Klick-Domain des Absenderkontos · <code className="text-primary">{"{first_name}"}</code> Vorname · <code className="text-primary">{"{last_name}"}</code> Nachname · <code className="text-primary">{"{anrede}"}</code> Anrede aus der Empfängerliste (leer, wenn nicht angegeben). Gelten auch im Betreff.</p>
          <p>Bitte baue einen Abmeldelink ein, z. B. <code>https://{"{klick_domain}"}/abmelden</code>, und versende nur an Empfänger mit Einwilligung.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Vorschau</Button>
        <Button variant="secondary" onClick={saveDraft} disabled={busy}>Als Entwurf speichern</Button>
        <Button onClick={saveAndSend} disabled={busy}>Speichern &amp; Senden starten</Button>
        <Button variant="ghost" onClick={() => navigate({ to: "/admin/campaigns" })}>Abbrechen</Button>
      </div>
      <PreviewDialog open={preview} onOpenChange={setPreview} subject={subject} html={html} />
      <SendDialog campaign={sendFor} onClose={() => { setSendFor(null); navigate({ to: "/admin/campaigns" }); }} />
    </div>
  );
}
