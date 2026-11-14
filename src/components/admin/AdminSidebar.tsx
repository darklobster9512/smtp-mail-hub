import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, LayoutDashboard, Mail, Megaphone, Network, Users } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Übersicht", url: "/admin/overview", icon: LayoutDashboard },
  { title: "E-Mail-Konten", url: "/admin/accounts", icon: Mail },
  { title: "Proxys", url: "/admin/proxies", icon: Network },
  { title: "Kampagnen", url: "/admin/campaigns", icon: Megaphone },
  { title: "Leads", url: "/admin/leads", icon: Users },
  { title: "Automatisierung", url: "/admin/automation", icon: Bot },
] as const;

export function AdminSidebar() {
  const { setOpenMobile } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 font-semibold">
          <Mail className="h-5 w-5 shrink-0 text-primary" />
          <span className="group-data-[collapsible=icon]:hidden">Postwerk</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboards</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path === i.url || path.startsWith(i.url + "/")} tooltip={i.title}>
                    <Link to={i.url} onClick={() => setOpenMobile(false)}>
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
