import { Calendar, CheckCircle2, User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { getActiveSchedulesWithDetailsAction } from "@/actions/log-schedules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DAYS_MAP: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function SchedulesTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 rounded-lg border p-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

async function SchedulesTable() {
  const schedules = await getActiveSchedulesWithDetailsAction();

  if (!schedules || schedules.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/50">
        <p className="text-muted-foreground">
          No active schedules found. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template</TableHead>
            <TableHead>Schedule Period</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Reviewer</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/logs/templates/${schedule.template_id}`}
                    className="font-medium hover:underline"
                  >
                    {schedule.template_name}
                  </Link>
                  
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(schedule.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  {schedule.end_date && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        {new Date(schedule.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {!schedule.end_date && (
                    <span className="text-muted-foreground text-xs">
                      Ongoing
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {schedule.days_of_week?.map((day) => (
                    <Badge key={day} variant="outline" className="text-xs">
                      {DAYS_MAP[day]}
                    </Badge>
                  )) || (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  {schedule.assignee_name ? (
                    <>
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{schedule.assignee_name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  {schedule.reviewer_name ? (
                    <>
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{schedule.reviewer_name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/logs/templates/${schedule.template_id}/schedule/edit`}>
                    Update
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ScheduledLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Scheduled Logs</h1>
          <p className="mt-2 text-muted-foreground">
            View all active log schedules for your organization.
          </p>
        </div>
      </div>

      <Suspense fallback={<SchedulesTableSkeleton />}>
        <SchedulesTable />
      </Suspense>
    </div>
  );
}
