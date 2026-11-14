import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SAMPLE_VARS, fillTemplate } from "@/lib/campaign-parse";

export function PreviewDialog({ open, onOpenChange, subject, html }: { open: boolean; onOpenChange: (o: boolean) => void; subject: string; html: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vorschau</DialogTitle>
          <p className="text-sm text-muted-foreground">Betreff: {fillTemplate(subject, SAMPLE_VARS, { html: false }) || "–"}</p>
        </DialogHeader>
        <iframe
          title="E-Mail-Vorschau"
          sandbox=""
          srcDoc={fillTemplate(html, SAMPLE_VARS, { html: true })}
          className="h-[60vh] w-full rounded-md border border-border bg-white"
        />
        <p className="text-xs text-muted-foreground">Platzhalter sind durch Beispielwerte ersetzt.</p>
      </DialogContent>
    </Dialog>
  );
}
