import { auth } from "@clerk/nextjs/server";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  User,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDailyLogByIdAction } from "@/actions/daily-logs";
import { AssigneeView } from "@/components/tasks/AssigneeView";
import { ReviewerView } from "@/components/tasks/ReviewerView";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    redirect("/login");
  }

  const log = await getDailyLogByIdAction(id);

  if (!log) {
    notFound();
  }

  const isAssignee = log.assignee_id === userId;
  const isReviewer = log.reviewer_id === userId;

  // Check if user has access to this log
  if (!isAssignee && !isReviewer) {
    redirect("/tasks");
  }

  const totalTasks = Object.keys(log.tasks).length;
  const completedTasks = Object.values(log.tasks).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-3xl tracking-tight">Daily Log</h1>
          <StatusBadge status={log.status} />
        </div>
        <p className="mt-2 text-muted-foreground">
          {isAssignee ? "Complete your tasks" : "Review and approve"}
        </p>
      </div>

      {/* Log Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Template and SOP */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Template</span>
          </div>
          <p className="mt-1 font-semibold">{log.template_name}</p>
          {log.template_category && (
            <Badge variant="outline" className="mt-2">
              {log.template_category}
            </Badge>
          )}
        </div>

        {log.template_sop && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="flex items-center gap-2 font-semibold text-sm">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              Standard Operating Procedure
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm">
              {log.template_sop}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Log Date */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Log Date</span>
          </div>
          <p className="mt-1 font-semibold">{formatDate(log.log_date)}</p>
        </div>

        {/* Show Reviewer when user is assignee, show Assignee when user is reviewer */}
        {isAssignee ? (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">Reviewer</span>
            </div>
            <p className="mt-1 font-semibold">
              {log.reviewer_name || "Not assigned"}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">Assignee</span>
            </div>
            <p className="mt-1 font-semibold">
              {log.assignee_name || "Unassigned"}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">Progress</span>
        </div>
        <p className="mt-1 font-semibold">
          {completedTasks} / {totalTasks} tasks
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${
                totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Conditional Views (Interactive) */}
      {isAssignee &&
        (log.status === "PENDING" || log.status === "REJECTED") && (
          <AssigneeView log={log} />
        )}

      {isReviewer && log.status === "PENDING_APPROVAL" && (
        <ReviewerView log={log} />
      )}

      {/* Read-only view for other states or roles */}
      {(log.status === "APPROVED" ||
        (log.status === "PENDING_APPROVAL" && isAssignee) ||
        (log.status === "REJECTED" && isReviewer) ||
        (log.status === "PENDING" && isReviewer)) && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm">Task List</h3>
          <div className="mt-4 space-y-2">
            {Object.entries(log.tasks).length > 0 ? (
              Object.entries(log.tasks).map(([task, completed]) => (
                <div
                  key={task}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                      completed
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {completed && (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      completed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {task}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No tasks defined.</p>
            )}
          </div>

          <div className="mt-6 space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Submission Summary</h4>
                <p className="text-muted-foreground text-xs">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
              </div>
              {log.tasks_sign_off && (
                <Badge
                  variant={
                    log.tasks_sign_off === "ALL_GOOD"
                      ? "success"
                      : "destructive"
                  }
                  className="px-2"
                >
                  {log.tasks_sign_off === "ALL_GOOD" ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      All Good
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Action Required
                    </>
                  )}
                </Badge>
              )}
            </div>

            {log.assignee_comment && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  Assignee Comment
                </p>
                <p className="text-foreground text-sm italic leading-relaxed">
                  "{log.assignee_comment}"
                </p>
              </div>
            )}
          </div>

          {log.reviewer_comment && (
            <div className="mt-4 rounded-md bg-muted p-3">
              <p className="font-medium text-sm">Reviewer Comment</p>
              <p className="mt-1 text-muted-foreground text-sm">
                {log.reviewer_comment}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
