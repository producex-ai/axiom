"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createLogSchedule,
  getActiveLogSchedules,
  getLogSchedulesByTemplateId,
} from "@/db/queries/log-schedules";
import { getOrgMembersAction } from "./clerk";

// Define validation schema
const CreateScheduleSchema = z.object({
  template_id: z.string().uuid("Invalid template ID"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  assignee_id: z.string().optional(),
  reviewer_id: z.string().optional(),
  days_of_week: z
    .array(z.number().min(0).max(6))
    .min(1, "Select at least one day"),
});

export type CreateScheduleState = {
  message?: string;
  errors?: {
    template_id?: string[];
    start_date?: string[];
    end_date?: string[];
    assignee_id?: string[];
    reviewer_id?: string[];
    days_of_week?: string[];
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

  // Extract days of week - handling multiple checkboxes
  const days = formData
    .getAll("days_of_week")
    .map((d) => Number.parseInt(d.toString()));

  // Validate
  const validatedFields = CreateScheduleSchema.safeParse({
    template_id,
    start_date,
    end_date: end_date || undefined,
    assignee_id: assignee_id || undefined,
    reviewer_id: reviewer_id || undefined,
    days_of_week: days,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please fix the errors below",
    };
  }

  try {
    await createLogSchedule({
      template_id: validatedFields.data.template_id,
      org_id: orgId,
      start_date: new Date(validatedFields.data.start_date),
      end_date: validatedFields.data.end_date
        ? new Date(validatedFields.data.end_date)
        : null,
      assignee_id: validatedFields.data.assignee_id || null,
      reviewer_id: validatedFields.data.reviewer_id || null,
      days_of_week: validatedFields.data.days_of_week,
      status: "ACTIVE",
      created_by: userId,
    });

    revalidatePath(`/logs/templates/${template_id}`);
    revalidatePath("/logs/scheduled");
    return { success: true, message: "Schedule created successfully" };
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return { message: "Failed to create schedule. Please try again." };
  }
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
  days_of_week: number[] | null;
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
      days_of_week: schedule.days_of_week,
      status: schedule.status,
    }),
  );

  return enrichedSchedules;
}
