"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createLogTemplate,
  type FieldItem,
  getLogTemplateById,
  getLogTemplates,
  type TaskItem,
  type TemplateType,
  updateLogTemplate,
} from "@/db/queries/log-templates";

// Define validation schemas for different item types
const TaskItemSchema = z.object({
  name: z.string().min(1, "Task name is required"),
});

const FieldItemSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  description: z.string().default(""),
  required: z.boolean().default(false),
});

// Separate validation schemas for each template type
const TaskListTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sop: z.string().min(1, "SOP is required"),
  template_type: z.literal("task_list"),
  items: z.array(TaskItemSchema).min(1, "At least one item is required"),
  review_time: z.enum(["1_month", "3_months", "6_months", "1_year"]).optional(),
});

const FieldInputTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sop: z.string().min(1, "SOP is required"),
  template_type: z.literal("field_input"),
  items: z.array(FieldItemSchema).min(1, "At least one item is required"),
  review_time: z.enum(["1_month", "3_months", "6_months", "1_year"]).optional(),
});

// Union of the two template schemas
const CreateTemplateSchema = z.discriminatedUnion("template_type", [
  TaskListTemplateSchema,
  FieldInputTemplateSchema,
]);

export type CreateTemplateState = {
  message?: string;
  errors?: {
    name?: string[];
    description?: string[];
    category?: string[];
    sop?: string[];
    template_type?: string[];
    items?: string[];
    review_time?: string[];
  };
  success?: boolean;
};

// Common validation and extraction logic
const processFormData = (formData: FormData) => {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const category = formData.get("category") as string;
  const sop = formData.get("sop") as string;
  const review_time = formData.get("review_time") as string | null;
  const template_type = formData.get("template_type") as TemplateType;

  // Parse items based on template type
  let items: TaskItem[] | FieldItem[];

  if (template_type === "task_list") {
    // Extract task items - simple array of names
    items = formData
      .getAll("items")
      .map((item) => item.toString())
      .filter((item) => item.trim() !== "")
      .map((name) => ({ name }));
  } else {
    // Extract field items - parse JSON array from form
    const itemsJson = formData.get("items") as string;
    try {
      items = JSON.parse(itemsJson);
    } catch (error) {
      console.error("Failed to parse items JSON:", error);
      items = [];
    }
  }

  // Validate
  const validatedFields = CreateTemplateSchema.safeParse({
    name,
    description,
    category,
    sop,
    template_type,
    items,
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
      description: validatedFields.data.description || null,
      category: validatedFields.data.category,
      sop: validatedFields.data.sop,
      template_type: validatedFields.data.template_type,
      items: validatedFields.data.items,
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
        description: validatedFields.data.description || null,
        category: validatedFields.data.category,
        sop: validatedFields.data.sop,
        template_type: validatedFields.data.template_type,
        items: validatedFields.data.items,
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
