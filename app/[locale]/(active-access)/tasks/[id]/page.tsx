import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getOrgMembersAction } from "@/actions/auth/clerk";
import { getDailyLogByIdAction } from "@/actions/logs/daily-logs";
import { AssigneeView } from "@/components/tasks/AssigneeView";
import { ReviewerView } from "@/components/tasks/ReviewerView";
import { TemplateDetailsView } from "@/components/tasks/TemplateDetailsView";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getCompletedTasksCount,
  getTotalTasksCount,
} from "@/lib/utils/task-utils";

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

  const totalTasks = getTotalTasksCount(log.tasks);
  const completedTasks = getCompletedTasksCount(log.tasks, log.template_type);

  // Determine if assignments can be edited
  // Only reviewers can edit, only when status is PENDING, and no tasks completed
  const canEditAssignments =
    isReviewer && log.status === "PENDING" && completedTasks === 0;

  // Fetch members if editing is allowed
  const members = canEditAssignments ? await getOrgMembersAction() : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-3xl tracking-tight">
            {log.template_name}
          </h1>
          <StatusBadge status={log.status} />
        </div>
        <p className="mt-2 text-muted-foreground">
          {isAssignee ? "Complete your tasks" : "Review and approve"}
        </p>
      </div>

      {/* Log Details */}
      <TemplateDetailsView
        logId={log.id}
        templateName={log.template_name}
        templateDescription={log.template_description}
        templateCategory={log.template_category}
        templateSop={log.template_sop}
        assigneeId={log.assignee_id}
        assigneeName={log.assignee_name}
        reviewerId={log.reviewer_id}
        reviewerName={log.reviewer_name}
        logDate={log.log_date}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        canEditAssignments={canEditAssignments}
        members={members}
      />

      {/* Assignee View */}
      {isAssignee && (
        <AssigneeView
          log={log}
          mode={
            log.status === "PENDING" || log.status === "REJECTED"
              ? "edit"
              : "view"
          }
        />
      )}

      {/* Reviewer View */}
      {!isAssignee && isReviewer && (
        <ReviewerView
          log={log}
          mode={log.status === "PENDING_APPROVAL" ? "edit" : "view"}
        />
      )}
    </div>
  );
}
