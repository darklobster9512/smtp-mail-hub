import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, LayoutDashboard, LogOut, Mail, Megaphone, Network, Users } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

export const NAV_GROUPS = [
  { label: "Betrieb", items: [
    { title: "Übersicht", url: "/admin/overview", icon: LayoutDashboard },
    { title: "Kampagnen", url: "/admin/campaigns", icon: Megaphone },
    { title: "Leads", url: "/admin/leads", icon: Users },
  ] },
  { label: "Versand", items: [
    { title: "E-Mail-Konten", url: "/admin/accounts", icon: Mail },
    { title: "Proxys", url: "/admin/proxies", icon: Network },
    { title: "Automatisierung", url: "/admin/automation", icon: Bot },
  ] },
] as const;

export function AdminSidebar({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const { setOpenMobile } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Mail className="h-4 w-4" /></span>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold">Postwerk</div>
            <div className="text-[11px] text-muted-foreground">Admin Console</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((i) => {
                  const active = path === i.url || path.startsWith(i.url + "/");
                  return (
                    <SidebarMenuItem key={i.url} className="relative">
                      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />}
                      <SidebarMenuButton asChild isActive={active} tooltip={i.title} className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium">
                        <Link to={i.url} onClick={() => setOpenMobile(false)}>
                          <i.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                          <span>{i.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-xs font-semibold uppercase">{email.slice(0, 2)}</span>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium">{email}</div>
            <div className="text-[11px] text-muted-foreground">Administrator</div>
          </div>
          <button onClick={onSignOut} title="Logout" className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground group-data-[collapsible=icon]:hidden"><LogOut className="h-4 w-4" /></button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
