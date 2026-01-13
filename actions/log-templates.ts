"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createLogTemplate,
  getLogTemplateById,
  getLogTemplates,
  updateLogTemplate,
} from "@/db/queries/log-templates";

// Define validation schema
const CreateTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  sop: z.string().min(1, "SOP is required"),
  tasks: z
    .array(z.string())
    .min(1, "At least one task is required")
    .refine((tasks) => tasks.every((t) => t.trim().length > 0), {
      message: "Tasks cannot be empty",
    }),
  review_time: z.enum(["1_month", "3_months", "6_months", "1_year"]).optional(),
});

export type CreateTemplateState = {
  message?: string;
  errors?: {
    name?: string[];
    category?: string[];
    sop?: string[];
    tasks?: string[];
    review_time?: string[];
  };
  success?: boolean;
};

// Common validation and extraction logic
const processFormData = (formData: FormData) => {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const sop = formData.get("sop") as string;
  const review_time = formData.get("review_time") as string | null;

  // Extract tasks - handling getAll properly
  const tasks = formData
    .getAll("tasks")
    .map((task) => task.toString())
    .filter((task) => task.trim() !== "");

  // Validate
  const validatedFields = CreateTemplateSchema.safeParse({
    name,
    category,
    sop,
    tasks,
    review_time: review_time || undefined,
  });

  return validatedFields;
};

export async function createLogTemplateAction(
  _prevState: CreateTemplateState,
  formData: FormData,
): Promise<CreateTemplateState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  const validatedFields = processFormData(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please fix the errors below",
    };
  }

  try {
    await createLogTemplate({
      name: validatedFields.data.name,
      category: validatedFields.data.category,
      sop: validatedFields.data.sop,
      task_list: validatedFields.data.tasks,
      org_id: orgId,
      created_by: userId,
      review_time: validatedFields.data.review_time || null,
    });

    revalidatePath("/logs/templates");
  } catch (error) {
    console.error("Failed to create template:", error);
    return { message: "Failed to create template. Please try again." };
  }

  redirect("/logs/templates");
}

export async function updateLogTemplateAction(
  id: string,
  _prevState: CreateTemplateState,
  formData: FormData,
): Promise<CreateTemplateState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  const validatedFields = processFormData(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please fix the errors below",
    };
  }

  try {
    await updateLogTemplate(
      id,
      {
        name: validatedFields.data.name,
        category: validatedFields.data.category,
        sop: validatedFields.data.sop,
        task_list: validatedFields.data.tasks,
        review_time: validatedFields.data.review_time || null,
      },
      orgId,
    );

    revalidatePath("/logs/templates");
  } catch (error) {
    console.error("Failed to update template:", error);
    return { message: "Failed to update template. Please try again." };
  }

  redirect("/logs/templates");
}

export async function getLogTemplatesAction() {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const result = await getLogTemplates(orgId);
  return result;
}

export async function getLogTemplateByIdAction(id: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const result = await getLogTemplateById(id, orgId);
  return result;
}
