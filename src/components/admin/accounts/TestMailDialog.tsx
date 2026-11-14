import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { sendTestMail } from "@/lib/smtp.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Account } from "./AccountDialog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function TestMailDialog({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const send = useServerFn(sendTestMail);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = EMAIL_RE.test(to.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account || !valid) return;
    setBusy(true);
    try {
      const res = await send({ data: { account_id: account.id, test_email_to: to.trim() } });
      if (res.success) { toast.success(`Testmail an ${to.trim()} gesendet`); onClose(); }
      else notifyError(res.error, "Senden fehlgeschlagen");
    } catch (err) {
      notifyError(err, "Senden fehlgeschlagen");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Testmail über {account?.label || account?.host}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input type="email" placeholder="empfaenger@example.com" value={to} onChange={(e) => setTo(e.target.value)} autoFocus />
          <Button type="submit" disabled={!valid || busy}>{busy ? "Sende…" : "Senden"}</Button>
        </form>
        {to && !valid && <p className="text-xs text-destructive">Bitte eine gültige E-Mail-Adresse eingeben.</p>}
      </DialogContent>
    </Dialog>
  );
}
