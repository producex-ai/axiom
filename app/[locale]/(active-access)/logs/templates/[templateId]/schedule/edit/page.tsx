import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgMembersAction } from "@/actions/clerk";
import { getLogScheduleByIdAction } from "@/actions/log-schedules";
import { getLogTemplateByIdAction } from "@/actions/log-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScheduleForm } from "../_components/schedule-form";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function EditSchedulePage({ params }: PageProps) {
  const { templateId } = await params;
  const [template, members] = await Promise.all([
    getLogTemplateByIdAction(templateId),
    getOrgMembersAction(),
  ]);

  if (!template) {
    notFound();
  }

  if (!template.schedule_id) {
    notFound(); // No schedule to edit
  }

  const schedule = await getLogScheduleByIdAction(template.schedule_id);

  if (!schedule) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/logs/templates/${templateId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl tracking-tight">
              Update Schedule: {template.name}
            </h1>
            <Badge
              variant={schedule.status === "ACTIVE" ? "default" : "secondary"}
            >
              {schedule.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Modify the schedule for this log template.
          </p>
        </div>
      </div>

      <ScheduleForm
        templateId={templateId}
        members={members}
        mode="edit"
        initialData={{
          scheduleId: schedule.id,
          startDate: schedule.start_date.toISOString().split("T")[0],
          endDate: schedule.end_date
            ? schedule.end_date.toISOString().split("T")[0]
            : undefined,
          assigneeId: schedule.assignee_id || undefined,
          reviewerId: schedule.reviewer_id || undefined,
          frequency: schedule.frequency,
          daysOfWeek: schedule.days_of_week || undefined,
          dayOfMonth: schedule.day_of_month || undefined,
          monthOfYear: schedule.month_of_year || undefined,
          timesPerDay: schedule.times_per_day || 1,
          status: schedule.status === "COMPLETED" ? "PAUSED" : schedule.status,
        }}
      />
    </div>
  );
}
