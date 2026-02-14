import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";

type ReviewSummaryProps = {
  log: DailyLogWithDetails;
};

export function ReviewSummary({ log }: ReviewSummaryProps) {
  const formatDateTime = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  if (log.status !== "APPROVED" && log.status !== "REJECTED") {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">Review Summary</h4>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {formatDateTime(log.reviewed_at)}
            </p>
          </div>
          <Badge
            variant={log.status === "APPROVED" ? "success" : "destructive"}
            className="px-2"
          >
            {log.status === "APPROVED" ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Approved
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" />
                Rejected
              </>
            )}
          </Badge>
        </div>

        {log.reviewer_comment && (
          <p className="text-foreground text-sm">"{log.reviewer_comment}"</p>
        )}
      </div>
    </div>
  );
}
