import { createFileRoute, Link, Outlet, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { friendlyError } from "@/lib/notify";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { runBackgroundTick } from "@/lib/leads.functions";
import { ChevronRight, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar, NAV_GROUPS } from "@/components/admin/AdminSidebar";

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

  const tick = useServerFn(runBackgroundTick);
  // Background sending while the panel is open: one step per minute (DB lock prevents overlaps).
  useEffect(() => {
    let busy = false;
    const run = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const r = await tick();
        if (r.campaigns.sent || r.campaigns.failed || r.leads.sent || r.leads.failed) {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      } catch { /* ignore, next minute retries */ }
      busy = false;
    };
    const t = setInterval(run, 60000);
    run();
    return () => clearInterval(t);
  }, [tick, queryClient]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const path = useRouterState({ select: (r) => r.location.pathname });
  const group = NAV_GROUPS.find((g) => g.items.some((i) => path === i.url || path.startsWith(i.url + "/")));
  const item = group?.items.find((i) => path === i.url || path.startsWith(i.url + "/"));
  const email = user.email ?? "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-canvas font-sans">
        <AdminSidebar email={email} onSignOut={signOut} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="h-4 w-px bg-border" />
            <nav className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">{group?.label ?? "Admin"}</span>
              {item && <><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate font-medium">{item.title}</span></>}
            </nav>
            <span className="ml-auto hidden items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> System aktiv
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-border bg-muted text-xs font-semibold uppercase sm:ml-0">{email.slice(0, 2)}</DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" /> Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
