"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createLogSchedule,
  getActiveLogSchedules,
  getLogScheduleById,
  getLogSchedulesByTemplateId,
  updateLogSchedule,
} from "@/db/queries/log-schedules";
import { getLogTemplateById } from "@/db/queries/log-templates";
import { getOrgMembersAction } from "./clerk";

// Define validation schema with date validation
const CreateScheduleSchema = z
  .object({
    template_id: z.string().uuid("Invalid template ID"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    assignee_id: z.string().min(1, "Assignee is required"),
    reviewer_id: z.string().min(1, "Reviewer is required"),
    frequency: z.enum([
      "weekly",
      "monthly",
      "quarterly",
      "half_yearly",
      "yearly",
    ]),
    days_of_week: z.array(z.number().min(0).max(6)).optional(),
    day_of_month: z.coerce.number().int().min(1).max(31).optional(),
    month_of_year: z.coerce.number().int().min(1).max(12).optional(),
    times_per_day: z.coerce.number().int().min(1).max(4).default(1),
  })
  .refine(
    (data) => {
      // Validate days_of_week is required for weekly frequency
      if (data.frequency === "weekly") {
        return data.days_of_week && data.days_of_week.length > 0;
      }
      return true;
    },
    {
      message: "Select at least one day for weekly schedules",
      path: ["days_of_week"],
    },
  )
  .refine(
    (data) => {
      // Validate day_of_month is required for non-weekly frequencies
      if (data.frequency !== "weekly") {
        return data.day_of_month !== undefined;
      }
      return true;
    },
    {
      message: "Day of month is required for non-weekly schedules",
      path: ["day_of_month"],
    },
  )
  .refine(
    (data) => {
      // Validate month_of_year is required for yearly frequency
      if (data.frequency === "yearly") {
        return data.month_of_year !== undefined;
      }
      return true;
    },
    {
      message: "Month is required for yearly schedules",
      path: ["month_of_year"],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    },
  );

const UpdateScheduleSchema = z
  .object({
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    assignee_id: z.string().min(1, "Assignee is required"),
    reviewer_id: z.string().min(1, "Reviewer is required"),
    frequency: z.enum([
      "weekly",
      "monthly",
      "quarterly",
      "half_yearly",
      "yearly",
    ]),
    days_of_week: z.array(z.number().min(0).max(6)).optional(),
    day_of_month: z.coerce.number().int().min(1).max(31).optional(),
    month_of_year: z.coerce.number().int().min(1).max(12).optional(),
    times_per_day: z.coerce.number().int().min(1).max(4).default(1),
  })
  .refine(
    (data) => {
      if (data.frequency === "weekly") {
        return data.days_of_week && data.days_of_week.length > 0;
      }
      return true;
    },
    {
      message: "Select at least one day for weekly schedules",
      path: ["days_of_week"],
    },
  )
  .refine(
    (data) => {
      if (data.frequency !== "weekly") {
        return data.day_of_month !== undefined;
      }
      return true;
    },
    {
      message: "Day of month is required for non-weekly schedules",
      path: ["day_of_month"],
    },
  )
  .refine(
    (data) => {
      if (data.frequency === "yearly") {
        return data.month_of_year !== undefined;
      }
      return true;
    },
    {
      message: "Month is required for yearly schedules",
      path: ["month_of_year"],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    },
  );

export type CreateScheduleState = {
  message?: string;
  errors?: {
    template_id?: string[];
    start_date?: string[];
    end_date?: string[];
    assignee_id?: string[];
    reviewer_id?: string[];
    frequency?: string[];
    days_of_week?: string[];
    day_of_month?: string[];
    month_of_year?: string[];
    times_per_day?: string[];
  };
  success?: boolean;
};

export async function createLogScheduleAction(
  _prevState: CreateScheduleState,
  formData: FormData,
): Promise<CreateScheduleState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  // Extract fields
  const template_id = formData.get("template_id") as string;
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const assignee_id = formData.get("assignee_id") as string;
  const reviewer_id = formData.get("reviewer_id") as string;
  const frequency = formData.get("frequency") as string;
  const day_of_month = formData.get("day_of_month") as string;
  const month_of_year = formData.get("month_of_year") as string;
  const times_per_day = formData.get("times_per_day") as string;

  // Extract days of week - handling multiple checkboxes (only for weekly)
  const days = formData
    .getAll("days_of_week")
    .map((d) => Number.parseInt(d.toString()));

  // Validate
  const validatedFields = CreateScheduleSchema.safeParse({
    template_id,
    start_date,
    end_date,
    assignee_id,
    reviewer_id,
    frequency,
    days_of_week: days.length > 0 ? days : undefined,
    day_of_month: day_of_month || undefined,
    month_of_year: month_of_year || undefined,
    times_per_day,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // Check if template is already scheduled
  try {
    const template = await getLogTemplateById(
      validatedFields.data.template_id,
      orgId,
    );

    if (!template) {
      return { message: "Template not found" };
    }

    if (template.schedule_id) {
      return {
        message:
          "This template is already scheduled. Please update the existing schedule instead.",
        errors: {
          template_id: ["Template is already scheduled"],
        },
      };
    }

    await createLogSchedule({
      template_id: validatedFields.data.template_id,
      org_id: orgId,
      start_date: new Date(validatedFields.data.start_date),
      end_date: validatedFields.data.end_date
        ? new Date(validatedFields.data.end_date)
        : null,
      assignee_id: validatedFields.data.assignee_id || null,
      reviewer_id: validatedFields.data.reviewer_id || null,
      frequency: validatedFields.data.frequency,
      days_of_week: validatedFields.data.days_of_week || null,
      day_of_month: validatedFields.data.day_of_month || null,
      month_of_year: validatedFields.data.month_of_year || null,
      status: "ACTIVE",
      created_by: userId,
      times_per_day: validatedFields.data.times_per_day,
    });

    revalidatePath(`/logs/templates/${template_id}`);
    revalidatePath("/logs/scheduled");
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return { message: "Failed to create schedule. Please try again." };
  }

  redirect("/logs/scheduled");
}

export async function updateLogScheduleAction(
  scheduleId: string,
  _prevState: CreateScheduleState,
  formData: FormData,
): Promise<CreateScheduleState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  // Extract fields
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const assignee_id = formData.get("assignee_id") as string;
  const reviewer_id = formData.get("reviewer_id") as string;
  const frequency = formData.get("frequency") as string;
  const day_of_month = formData.get("day_of_month") as string;
  const month_of_year = formData.get("month_of_year") as string;
  const times_per_day = formData.get("times_per_day") as string;

  // Extract days of week
  const days = formData
    .getAll("days_of_week")
    .map((d) => Number.parseInt(d.toString()));

  // Validate
  const validatedFields = UpdateScheduleSchema.safeParse({
    start_date,
    end_date,
    assignee_id,
    reviewer_id,
    frequency,
    days_of_week: days.length > 0 ? days : undefined,
    day_of_month: day_of_month || undefined,
    month_of_year: month_of_year || undefined,
    times_per_day,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const updatedSchedule = await updateLogSchedule(
      scheduleId,
      {
        start_date: new Date(validatedFields.data.start_date),
        end_date: validatedFields.data.end_date
          ? new Date(validatedFields.data.end_date)
          : null,
        assignee_id: validatedFields.data.assignee_id || null,
        reviewer_id: validatedFields.data.reviewer_id || null,
        frequency: validatedFields.data.frequency,
        days_of_week: validatedFields.data.days_of_week || null,
        day_of_month: validatedFields.data.day_of_month || null,
        month_of_year: validatedFields.data.month_of_year || null,
        times_per_day: validatedFields.data.times_per_day,
      },
      orgId,
    );

    if (!updatedSchedule) {
      return { message: "Failed to update schedule" };
    }

    revalidatePath(`/logs/templates/${updatedSchedule.template_id}`);
    revalidatePath("/logs/scheduled");
  } catch (error) {
    console.error("Failed to update schedule:", error);
    return { message: "Failed to update schedule. Please try again." };
  }

  redirect("/logs/scheduled");
}

export async function getLogScheduleByIdAction(scheduleId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const result = await getLogScheduleById(scheduleId, orgId);
  return result;
}

export async function getLogSchedulesByTemplateAction(templateId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const result = await getLogSchedulesByTemplateId(templateId, orgId);
  return result;
}

export type ScheduleWithDetails = {
  id: string;
  template_id: string;
  template_name: string;
  template_category: string | null;
  start_date: Date;
  end_date: Date | null;
  assignee_name: string | null;
  reviewer_name: string | null;
  frequency: string;
  days_of_week: number[] | null;
  day_of_month: number | null;
  month_of_year: number | null;
  times_per_day: number;
  status: string;
};

export async function getActiveSchedulesWithDetailsAction(): Promise<
  ScheduleWithDetails[]
> {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const [schedules, members] = await Promise.all([
    getActiveLogSchedules(orgId),
    getOrgMembersAction(),
  ]);

  // Create a map of user IDs to names for quick lookup
  const userMap = new Map(
    members.map((m) => [
      m.id,
      m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.email,
    ]),
  );

  // Enrich schedules with user names
  const enrichedSchedules: ScheduleWithDetails[] = schedules.map(
    (schedule) => ({
      id: schedule.id,
      template_id: schedule.template_id,
      template_name: schedule.template_name,
      template_category: schedule.template_category,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      assignee_name: schedule.assignee_id
        ? userMap.get(schedule.assignee_id) || schedule.assignee_id
        : null,
      reviewer_name: schedule.reviewer_id
        ? userMap.get(schedule.reviewer_id) || schedule.reviewer_id
        : null,
      frequency: schedule.frequency,
      days_of_week: schedule.days_of_week,
      day_of_month: schedule.day_of_month,
      month_of_year: schedule.month_of_year,
      times_per_day: schedule.times_per_day || 1,
      status: schedule.status,
    }),
  );

  return enrichedSchedules;
}
