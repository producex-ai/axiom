"use client";

import {
  ChevronDown,
  ClipboardList,
  FileText,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useComplianceOverview } from "@/lib/compliance/queries";

const mainMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
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

const complianceItems = [
  {
    title: "Primus GFS",
    icon: ShieldCheck,
    href: "/dashboard/compliance",
    color: "text-primary",
    bgColor: "bg-primary/10",
    badgeKey: "compliance",
  },
  {
    title: "Company Documents",
    icon: FileText,
    href: "/dashboard/documents",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
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
              {mainMenuItems.map((item) => (
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
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto flex h-5 w-5 items-center justify-center p-0 font-semibold text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Compliance Group */}
              <Collapsible defaultOpen asChild>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="group">
                      <div className="bg-primary/10 text-primary rounded-md p-1.5 transition-transform group-hover:scale-110">
                        <ShieldCheck className="size-4" />
                      </div>
                      <span>Compliance</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {complianceItems.map((item) => {
                        const badgeValue =
                          item.badgeKey === "compliance" ? moduleCount : null;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive}
                            >
                              <Link href={item.href}>
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
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
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
