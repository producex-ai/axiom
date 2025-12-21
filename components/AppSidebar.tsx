"use client";

import {
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
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

const navigationItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Primus Compliance",
    icon: ShieldCheck,
    href: "/dashboard/compliance",
    color: "text-primary",
    bgColor: "bg-primary/10",
    badgeKey: "compliance",
  },
  {
    title: "Tasks",
    icon: ClipboardList,
    href: "/dashboard/tasks",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    badge: "3",
  },
  {
    title: "Activity Logs",
    icon: ScrollText,
    href: "/dashboard/logs",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: overview } = useComplianceOverview();

  const moduleCount =
    overview?.modules?.filter((m) => m.enabled).length || null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b bg-gradient-to-br from-primary/5 to-accent/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Primus GFS</span>
                  <span className="text-muted-foreground text-xs">
                    Compliance Suite
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-muted-foreground/80 text-xs">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const badgeValue =
                  item.badgeKey === "compliance" ? moduleCount : item.badge;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="group"
                    >
                      <Link href={item.href}>
                        <div
                          className={`${item.bgColor} ${item.color} rounded-md p-1.5 transition-transform group-hover:scale-110`}
                        >
                          <item.icon className="size-4" />
                        </div>
                        <span>{item.title}</span>
                        {badgeValue && (
                          <Badge
                            variant="secondary"
                            className="ml-auto flex h-5 w-5 items-center justify-center p-0 font-semibold text-xs"
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

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="font-semibold text-muted-foreground/80 text-xs">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/settings">
                    <div className="rounded-md bg-slate-500/10 p-1.5 text-slate-500">
                      <Settings className="size-4" />
                    </div>
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t bg-gradient-to-br from-primary/5 to-transparent">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              className="text-muted-foreground text-xs hover:text-primary"
            >
              <Sparkles className="size-3 text-primary" />
              <span>v4.0 Certified</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
