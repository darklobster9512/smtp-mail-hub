import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Account = {
  id: string; label: string | null; host: string; port: number; user_email: string;
  from_name: string | null; from_email: string | null; klick_domain: string | null;
  daily_limit: number; sent_today: number; status: string; created_at: string;
};

const schema = z.object({
  label: z.string().trim().min(1, "Pflichtfeld").max(100),
  host: z.string().trim().min(1, "Pflichtfeld").max(255),
  port: z.coerce.number().int().min(1).max(65535),
  user_email: z.string().trim().min(1, "Pflichtfeld").max(254),
  password: z.string().max(500),
  from_name: z.string().trim().max(100),
  from_email: z.string().trim().email("Ungültige E-Mail").max(254),
  klick_domain: z.string().trim().max(255),
  daily_limit: z.coerce.number().int().min(1).max(1000000),
  status: z.enum(["active", "blocked"]),
});
type Values = z.infer<typeof schema>;

const empty: Values = { label: "", host: "", port: 587, user_email: "", password: "", from_name: "", from_email: "", klick_domain: "", daily_limit: 1500, status: "active" };

export function AccountDialog({ open, onOpenChange, account, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; account: Account | null; onSaved: () => void;
}) {
  const isEdit = !!account;
  const [fromTouched, setFromTouched] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue, setError } = form;

  useEffect(() => {
    if (!open) return;
    setFromTouched(isEdit);
    reset(account ? {
      label: account.label ?? "", host: account.host, port: account.port, user_email: account.user_email, password: "",
      from_name: account.from_name ?? "", from_email: account.from_email ?? account.user_email,
      klick_domain: account.klick_domain ?? "", daily_limit: account.daily_limit,
      status: account.status === "blocked" ? "blocked" : "active",
    } : empty);
  }, [open, account, isEdit, reset]);

  const userEmail = watch("user_email");
  useEffect(() => { if (!fromTouched) setValue("from_email", userEmail); }, [userEmail, fromTouched, setValue]);

  async function onSubmit(v: Values) {
    if (!isEdit && !v.password) { setError("password", { message: "Pflichtfeld" }); return; }
    const row = {
      label: v.label, host: v.host, port: v.port, user_email: v.user_email, from_name: v.from_name || null,
      from_email: v.from_email, klick_domain: v.klick_domain || null, daily_limit: v.daily_limit, status: v.status,
      ...(v.password ? { password: v.password } : {}),
    };
    const { error } = isEdit
      ? await supabase.from("smtp_accounts").update(row).eq("id", account!.id)
      : await supabase.from("smtp_accounts").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Konto gespeichert" : "Konto angelegt");
    onOpenChange(false);
    onSaved();
  }

  const field = (name: keyof Values, label: string, props: React.ComponentProps<typeof Input> = {}, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} {...register(name)} {...props} />
      {errors[name] ? <p className="text-xs text-destructive">{errors[name]?.message}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{isEdit ? "Konto bearbeiten" : "Konto hinzufügen"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("label", "Label")}</div>
          {field("host", "SMTP-Host", { placeholder: "smtp.example.com" })}
          {field("port", "SMTP-Port", { type: "number" }, "465 = implizites TLS, 587 = STARTTLS")}
          {field("user_email", "SMTP-Benutzer", { autoComplete: "off" }, "Login-User für SMTP")}
          {field("password", "Passwort", { type: "password", autoComplete: "new-password" }, isEdit ? "Leer lassen = unverändert" : undefined)}
          {field("from_name", "Absendername")}
          <div className="space-y-1.5">
            <Label htmlFor="from_email">Absender-E-Mail</Label>
            <Input id="from_email" {...register("from_email", { onChange: () => setFromTouched(true) })} />
            {errors.from_email && <p className="text-xs text-destructive">{errors.from_email.message}</p>}
          </div>
          {field("klick_domain", "Klick-Domain", { placeholder: "klick.example.com" }, "Wird in Vorlagen als {klick_domain} ersetzt")}
          {field("daily_limit", "Tageslimit", { type: "number" })}
          {isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" {...register("status")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="active">active</option>
                <option value="blocked">blocked</option>
              </select>
            </div>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Speichern…" : "Speichern"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
