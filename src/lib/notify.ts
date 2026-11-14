import { toast } from "sonner";

/** Turns technical errors (DB, network, SMTP) into clear German messages. */
export function friendlyError(err: unknown, fallback = "Etwas ist schiefgelaufen."): string {
  const raw = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : typeof err === "string" ? err : "";
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  const m = raw.toLowerCase();
  if (code === "23505" || m.includes("duplicate key")) return "Dieser Eintrag existiert bereits.";
  if (code === "42501" || m.includes("permission denied") || m.includes("row-level security") || m.includes("keine berechtigung")) return "Keine Berechtigung für diese Aktion.";
  if (m.includes("unauthorized") || m.includes("jwt")) return "Sitzung abgelaufen – bitte neu anmelden.";
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed")) return "Keine Verbindung zum Server – bitte erneut versuchen.";
  if (m.includes("invalid login credentials")) return "E-Mail oder Passwort falsch.";
  if (m.includes("authentication") || m.includes("535")) return `SMTP-Anmeldung fehlgeschlagen: ${raw}`;
  return raw || fallback;
}

export const notifyError = (err: unknown, fallback?: string) => toast.error(friendlyError(err, fallback));
export const notifySuccess = (msg: string, description?: string) => toast.success(msg, description ? { description } : undefined);
