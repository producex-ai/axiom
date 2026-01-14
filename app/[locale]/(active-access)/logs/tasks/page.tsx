import { auth } from "@clerk/nextjs/server";
import { Calendar, ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getDailyLogsAction } from "@/actions/daily-logs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16">
      <ClipboardList className="h-16 w-16 text-muted-foreground/40" />
      <h3 className="mt-4 font-semibold text-lg">No logs yet</h3>
      <p className="mt-2 text-center text-muted-foreground text-sm">
        No daily logs have been created for the organization yet.
      </p>
    </div>
  );
}

export default async function OrgTasksPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/login");
  }

  // Get all logs for the organization
  const allLogs = await getDailyLogsAction();

  // Show all logs (not filtered)

  // Calculate stats
  const stats = {
    total: allLogs.length,
    pending: allLogs.filter((l) => l.status === "PENDING").length,
    pendingReview: allLogs.filter((l) => l.status === "PENDING_APPROVAL")
      .length,
    rejected: allLogs.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Organization Logs</h1>
        <p className="mt-2 text-muted-foreground">
          View all daily logs for the entire organization
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium text-muted-foreground text-sm">
            Total Pending
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
            Pending Review
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

      {allLogs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Log Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLogs.map((log) => {
                const totalTasks = Object.keys(log.tasks).length;
                const completedTasks = Object.values(log.tasks).filter(
                  Boolean,
                ).length;

                return (
                  <TableRow key={log.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link
                        href={`/tasks/${log.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(log.log_date)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tasks/${log.id}`}
                        className="hover:underline"
                      >
                        {log.template_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${log.id}`}>
                        {log.template_category ? (
                          <Badge variant="outline">
                            {log.template_category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${log.id}`}>
                        <span className="text-muted-foreground text-sm">
                          {log.assignee_name || "Unassigned"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${log.id}`}>
                        <span className="text-muted-foreground text-sm">
                          {log.reviewer_name || "No Reviewer"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${log.id}`}>
                        <StatusBadge status={log.status} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/tasks/${log.id}`}
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
        </div>
      )}
    </div>
  );
}
