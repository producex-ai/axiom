import { auth } from "@clerk/nextjs/server";
import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import { getDailyLogsAction } from "@/actions/daily-logs";
import { TaskListTable } from "@/components/logs/TaskListTable";

export default async function OrgTasksPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/login");
  }

  // Get all logs for the organization
  const logs = await getDailyLogsAction();

  // Filter for active (non-approved) logs
  const allLogs = logs.filter((log) => log.status !== "APPROVED");

  // Calculate stats
  const stats = {
    total: allLogs.length,
    pending: allLogs.filter((l) => l.status === "PENDING").length,
    pendingReview: allLogs.filter((l) => l.status === "PENDING_APPROVAL")
      .length,
    rejected: allLogs.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
          Organization Logs
        </h1>
        <p className="mt-2 text-muted-foreground text-sm sm:text-base">
          View all active daily logs for the organization
        </p>
      </div>

      <TaskListTable
        logs={allLogs}
        viewMode="organization"
        stats={stats}
        emptyState={{
          icon: (
            <ClipboardList className="h-16 w-16 text-muted-foreground/40" />
          ),
          title: "No logs yet",
          description:
            "No daily logs have been created for the organization yet.",
        }}
      />
    </div>
  );
}
