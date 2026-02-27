import { auth } from "@clerk/nextjs/server";
import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import { getDailyLogsAction } from "@/actions/logs/daily-logs";
import { TaskListTable } from "@/components/logs/TaskListTable";

export default async function TasksPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  // Get all tasks where user is assignee or reviewer
  const allTasks = await getDailyLogsAction();

  // Filter tasks for current user: All non-approved tasks
  const myTasks = allTasks.filter((task) => {
    const isUserInvolved =
      task.assignee_id === userId || task.reviewer_id === userId;
    const isNotApproved = task.status !== "APPROVED";

    return isUserInvolved && isNotApproved;
  });

  // Calculate stats
  const stats = {
    total: myTasks.length,
    pending: myTasks.filter((t) => t.status === "PENDING").length,
    pendingReview: myTasks.filter((t) => t.status === "PENDING_APPROVAL")
      .length,
    rejected: myTasks.filter((t) => t.status === "REJECTED").length,
  };

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
          My Tasks
        </h1>
        <p className="mt-2 text-muted-foreground text-sm sm:text-base">
          Manage your active daily log tasks and reviews
        </p>
      </div>

      <TaskListTable
        logs={myTasks}
        currentUserId={userId}
        viewMode="personal"
        stats={stats}
        emptyState={{
          icon: (
            <ClipboardList className="h-16 w-16 text-muted-foreground/40" />
          ),
          title: "No tasks for today",
          description:
            "You don't have any daily logs assigned to you for today.",
        }}
      />
    </div>
  );
}
