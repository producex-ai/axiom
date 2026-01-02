"use client";

import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Badge } from "@/components/ui/badge";

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
  SidebarRail,
} from "@/components/ui/sidebar";
import { useComplianceOverview } from "@/lib/compliance/queries";

const mainMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Tasks",
    icon: ClipboardList,
    href: "/dashboard/tasks",
    badge: "3",
  },
  {
    title: "Activity Logs",
    icon: ScrollText,
    href: "/dashboard/logs",
  },
];

const complianceItems = [
  {
    title: "Primus GFS",
    icon: ShieldCheck,
    href: "/dashboard/compliance",
    badgeKey: "compliance",
  },
  {
    title: "Company Documents",
    icon: FileText,
    href: "/dashboard/documents",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: overview } = useComplianceOverview();

  const moduleCount =
    overview?.modules?.filter((m) => m.enabled).length || null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Primus GFS</span>
                  <span className="text-muted-foreground text-xs">
                    Compliance
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="group relative px-3"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <span className="group-hover:text-foreground transition-colors">
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider">
            Compliance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {complianceItems.map((item) => {
                const badgeValue =
                  item.badgeKey === "compliance" ? moduleCount : null;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="group relative px-3"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="group-hover:text-foreground transition-colors">
                          {item.title}
                        </span>
                        {badgeValue && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold"
                          >
                            {badgeValue}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t">
        <div className="px-2 py-1 text-center text-xs text-muted-foreground">
          v4.0
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
