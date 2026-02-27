import { auth } from "@clerk/nextjs/server";
import { History } from "lucide-react";
import { redirect } from "next/navigation";

import { getDailyLogsAction } from "@/actions/logs/daily-logs";
import { TaskListTable } from "@/components/logs/TaskListTable";

export default async function TaskHistoryPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/login");
  }

  // Get all logs including obsolete ones for history
  const allLogs = await getDailyLogsAction({ includeObsolete: true });

  // Filter for current user and show only APPROVED or OBSOLETE tasks
  const userLogs = allLogs
    .filter(
      (log) =>
        (log.assignee_id === userId || log.reviewer_id === userId) &&
        (log.status === "APPROVED" || log.status === "OBSOLETE"),
    )
    .sort(
      (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime(),
    );

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
          My Task History
        </h1>
        <p className="mt-2 text-muted-foreground text-sm sm:text-base">
          View your approved and obsolete daily log tasks
        </p>
      </div>

      <TaskListTable
        logs={userLogs}
        currentUserId={userId}
        viewMode="personal"
        emptyState={{
          icon: <History className="h-16 w-16 text-muted-foreground/40" />,
          title: "No history found",
          description:
            "You don't have any approved or obsolete tasks in your history yet.",
        }}
      />
    </div>
  );
}
