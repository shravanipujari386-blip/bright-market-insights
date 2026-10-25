import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Home, LogOut, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/AppHeader";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Overview", url: "/", icon: Home },
  { title: "New research", url: "/dashboard", icon: PenLine },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (router) => router.location.pathname });

  const isActive = (url: string) => (url === "/" ? currentPath === "/" : currentPath.startsWith(url) && url !== "/dashboard" ? true : currentPath === url);
  const reportsActive = currentPath.startsWith("/reports/");

  const recent = useQuery({
    queryKey: ["reports", "sidebar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("research_reports")
        .select("id, query, status")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center px-2 group-data-[collapsible=icon]:justify-center">
          <span className="group-data-[collapsible=icon]:hidden">
            <Logo />
          </span>
          <span className="hidden font-display text-lg font-semibold group-data-[collapsible=icon]:inline">M</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Research</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recent.isLoading && (
                <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Loading…</p>
              )}
              {recent.data?.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No reports yet
                </p>
              )}
              {recent.data?.map((r) => (
                <SidebarMenuItem key={r.id}>
                  <SidebarMenuButton asChild isActive={reportsActive && currentPath === `/reports/${r.id}`} tooltip={r.query}>
                    <Link to="/reports/$id" params={{ id: r.id }}>
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{r.query}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log out" onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}>
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
