import { auth } from "@clerk/nextjs/server";
import { Calendar, ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getDailyLogsAction } from "@/actions/daily-logs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCompletedTasksCount,
  getTotalTasksCount,
} from "@/lib/utils/task-utils";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <ClipboardList className="h-16 w-16 text-muted-foreground/40" />
        <h3 className="mt-4 font-semibold text-lg">No tasks for today</h3>
        <p className="mt-2 text-center text-muted-foreground text-sm">
          You don't have any daily logs assigned to you for today.
        </p>
      </CardContent>
    </Card>
  );
}

export default async function TasksPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  // Get all tasks where user is assignee or reviewer
  const allTasks = await getDailyLogsAction();

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">My Tasks</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your active daily log tasks and reviews
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium text-muted-foreground text-sm">
            Total Tasks
          </p>
          <p className="mt-2 font-bold text-2xl">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium text-muted-foreground text-sm">Pending</p>
          <p className="mt-2 font-bold text-2xl text-orange-500">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium text-muted-foreground text-sm">
            For Review
          </p>
          <p className="mt-2 font-bold text-2xl text-blue-500">
            {stats.pendingReview}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium text-muted-foreground text-sm">Rejected</p>
          <p className="mt-2 font-bold text-2xl text-red-500">
            {stats.rejected}
          </p>
        </div>
      </div>

      {myTasks.length === 0 ? (
        <EmptyState />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
            <CardDescription>
              Daily logs assigned to you or awaiting your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Log Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>My Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTasks.map((task) => {
                  const isAssignee = task.assignee_id === userId;
                  const totalTasks = getTotalTasksCount(task.tasks);
                  const completedTasks = getCompletedTasksCount(
                    task.tasks,
                    task.template_type,
                  );

                  return (
                    <TableRow key={task.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(task.log_date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tasks/${task.id}`}
                          className="hover:underline"
                        >
                          {task.template_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tasks/${task.id}`}>
                          {task.template_category ? (
                            <Badge variant="outline">
                              {task.template_category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tasks/${task.id}`}>
                          <span className="text-sm">
                            {isAssignee ? "Assignee" : "Reviewer"}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tasks/${task.id}`}>
                          <StatusBadge status={task.status} />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="hover:underline"
                        >
                          <span className="text-sm">
                            {completedTasks}/{totalTasks}
                          </span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
