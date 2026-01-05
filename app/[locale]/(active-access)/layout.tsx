import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { checkProductActive } from "@/db/producex/queries";
import DashboardContent from "./dashboard/dashboard-content";

export default async function AuthCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    redirect("/sign-in");
  }
  if (!orgId) {
    redirect("/no-access");
  }
  const hasAccess = await checkProductActive(orgId);
  if (!hasAccess) {
    redirect("/no-access");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto bg-muted/30">
            <DashboardContent>{children}</DashboardContent>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
