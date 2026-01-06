"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createLogTemplate, getLogTemplates } from "@/db/queries/log-templates";

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
});

export type CreateTemplateState = {
  message?: string;
  errors?: {
    name?: string[];
    category?: string[];
    sop?: string[];
    tasks?: string[];
  };
  success?: boolean;
};

export async function createLogTemplateAction(
  prevState: CreateTemplateState,
  formData: FormData,
): Promise<CreateTemplateState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  // Extract basic fields
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const sop = formData.get("sop") as string;

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
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please fix the errors below",
    };
  }

  try {
    await createLogTemplate({
      name: validatedFields.data.name,
      category: validatedFields.data.category || null,
      sop: validatedFields.data.sop || null,
      task_list: validatedFields.data.tasks || [],
      org_id: orgId,
      created_by: userId,
    });

    revalidatePath("/logs/templates");
  } catch (error) {
    console.error("Failed to create template:", error);
    return { message: "Failed to create template. Please try again." };
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
