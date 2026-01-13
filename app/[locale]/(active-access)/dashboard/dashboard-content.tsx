"use client";

import { useSidebar } from "@/components/ui/sidebar";

export default function DashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useSidebar();

  // When sidebar is collapsed, use full width; otherwise use max-width container
  const isCollapsed = state === "collapsed";

  return (
    <div className={isCollapsed ? "w-full" : "container mx-auto max-w-7xl"}>
      <div className="p-6">{children}</div>
    </div>
  );
}
