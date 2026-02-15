import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";

type SubmissionSummaryProps = {
  log: DailyLogWithDetails;
};

export function SubmissionSummary({ log }: SubmissionSummaryProps) {
  const formatDateTime = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  if (log.status === "PENDING") {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">Submission Summary</h4>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {formatDateTime(log.submitted_at)}
            </p>
          </div>
          {log.tasks_sign_off && (
            <Badge
              variant={
                log.tasks_sign_off === "ALL_GOOD" ? "success" : "destructive"
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
          <p className="text-foreground text-sm">"{log.assignee_comment}"</p>
        )}
      </div>
    </div>
  );
}
