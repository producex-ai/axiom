"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type CreateScheduleState,
  createLogScheduleAction,
} from "@/actions/log-schedules";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-fit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Schedule...
        </>
      ) : (
        "Create Schedule"
      )}
    </Button>
  );
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

interface ScheduleFormProps {
  templateId: string;
}

export function ScheduleForm({ templateId }: ScheduleFormProps) {
  const initialState: CreateScheduleState = { message: "", errors: {} };
  const [state, formAction] = useActionState(
    createLogScheduleAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.success && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.success && (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* Hidden field for template_id */}
      <input type="hidden" name="template_id" value={templateId} />

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                aria-describedby="start_date-error"
                required
              />
              {state.errors?.start_date && (
                <p id="start_date-error" className="text-destructive text-sm">
                  {state.errors.start_date.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                aria-describedby="end_date-error"
              />
              {state.errors?.end_date && (
                <p id="end_date-error" className="text-destructive text-sm">
                  {state.errors.end_date.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Assignee and Reviewer */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assignee_id">Assignee (User ID)</Label>
              <Input
                id="assignee_id"
                name="assignee_id"
                placeholder="e.g., user_2abc..."
                aria-describedby="assignee_id-error"
              />
              {state.errors?.assignee_id && (
                <p id="assignee_id-error" className="text-destructive text-sm">
                  {state.errors.assignee_id.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewer_id">Reviewer (User ID)</Label>
              <Input
                id="reviewer_id"
                name="reviewer_id"
                placeholder="e.g., user_2def..."
                aria-describedby="reviewer_id-error"
              />
              {state.errors?.reviewer_id && (
                <p id="reviewer_id-error" className="text-destructive text-sm">
                  {state.errors.reviewer_id.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-4">
            <div>
              <Label>Days of Week</Label>
              <p className="mt-1 text-muted-foreground text-sm">
                Select the days when this log should be created
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    name="days_of_week"
                    value={day.value}
                  />
                  <Label
                    htmlFor={`day-${day.value}`}
                    className="cursor-pointer font-normal text-sm"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
            {state.errors?.days_of_week && (
              <p className="text-destructive text-sm">
                {state.errors.days_of_week.join(", ")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
