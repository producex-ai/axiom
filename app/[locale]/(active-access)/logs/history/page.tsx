import { auth } from "@clerk/nextjs/server";
import { History } from "lucide-react";
import { redirect } from "next/navigation";

import { getDailyLogsAction } from "@/actions/logs/daily-logs";
import { TaskListTable } from "@/components/logs/TaskListTable";

export default async function HistoryPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/login");
  }

  const allLogs = await getDailyLogsAction({
    status: "APPROVED",
  });

  // Sort by date descending (most recent first)
  const sortedLogs = allLogs.sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime(),
  );

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
          Organisation Logs History
        </h1>
        <p className="mt-2 text-muted-foreground text-sm sm:text-base">
          View all approved daily logs
        </p>
      </div>

      <TaskListTable
        logs={sortedLogs}
        viewMode="organization"
        emptyState={{
          icon: <History className="h-16 w-16 text-muted-foreground/40" />,
          title: "No history found",
          description: "There are no completed daily logs in the history yet.",
        }}
      />
    </div>
  );
}
