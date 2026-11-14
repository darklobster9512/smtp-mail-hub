import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { friendlyError } from "@/lib/notify";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin – Postwerk" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
  errorComponent: AdminError,
});

function AdminError({ error }: { error: unknown }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Diese Seite konnte nicht geladen werden</h1>
      <p className="mt-2 text-sm text-muted-foreground">{friendlyError(error)}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => router.invalidate()}>Erneut versuchen</Button>
        <Button variant="secondary" asChild><Link to="/admin/overview">Zur Übersicht</Link></Button>
      </div>
    </div>
  );
}

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background font-sans">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border px-4">
            <SidebarTrigger />
            <span className="ml-auto hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <Button size="sm" variant="secondary" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
