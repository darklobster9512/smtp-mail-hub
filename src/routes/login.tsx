import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login – Postwerk Admin" },
      { name: "description", content: "Anmeldung zum Postwerk Admin-Panel." },
      { property: "og:title", content: "Login – Postwerk Admin" },
      { property: "og:description", content: "Anmeldung zum Postwerk Admin-Panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: adminExists, isLoading } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin/overview", replace: true });
    });
  }, [navigate]);

  const canRegister = adminExists === false;
  const activeMode = canRegister ? mode : "login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (activeMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin/overview` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Konto erstellt. Bitte bestätige deine E-Mail-Adresse.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/admin/overview", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <Mail className="h-5 w-5 text-primary" /> Postwerk Admin
        </Link>
        <div className="rounded-xl border border-border bg-card p-6">
          {canRegister && (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md py-1.5 ${mode === m ? "bg-background text-foreground" : "text-muted-foreground"}`}
                >
                  {m === "login" ? "Login" : "Registrieren"}
                </button>
              ))}
            </div>
          )}
          <h1 className="text-xl font-semibold">{activeMode === "login" ? "Anmelden" : "Admin-Konto erstellen"}</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={busy || isLoading}>
              {busy ? "Bitte warten…" : activeMode === "login" ? "Anmelden" : "Registrieren"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
