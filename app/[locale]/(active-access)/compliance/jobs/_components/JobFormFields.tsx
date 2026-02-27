"use client";

import { Control, FieldErrors } from "react-hook-form";
import type { CreateJobInput, UpdateJobInput } from "@/lib/validators/jobValidators";
import type { OrgMember } from "@/actions/auth/clerk";
import { FREQUENCY_LABELS, type ScheduleFrequency } from "@/lib/cron/cron-utils";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JobFormFieldsProps {
  control: Control<CreateJobInput | UpdateJobInput | any>;
  members: OrgMember[];
  showFrequencyAndDate?: boolean;
}

export function JobFormFields({ 
  control, 
  members,
  showFrequencyAndDate = true 
}: JobFormFieldsProps) {
  return (
    <>
      {/* Frequency and Date - 2 columns (only shown if needed) */}
      {showFrequencyAndDate && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FormField
            control={control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Frequency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(
                      Object.entries(FREQUENCY_LABELS) as [
                        ScheduleFrequency,
                        string,
                      ][]
                    ).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="next_execution_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Execution Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    className="w-full"
                    {...field}
                    value={typeof field.value === 'string' ? field.value : field.value?.toISOString().split('T')[0] || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Assignee - full width */}
      <FormField
        control={control}
        name="assigned_to"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assignee</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {members.map((member) => {
                  const displayName = [member.firstName, member.lastName]
                    .filter(Boolean)
                    .join(" ") || member.email;
                  return (
                    <SelectItem key={member.id} value={member.id}>
                      {displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
