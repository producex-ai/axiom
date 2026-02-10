"use server";

import { auth } from "@clerk/nextjs/server";
import {
  createJobTemplateSchema,
  updateJobTemplateSchema,
  type CreateJobTemplateInput,
  type UpdateJobTemplateInput,
} from "@/lib/validators/jobValidators";
import * as jobTemplateService from "@/lib/services/jobTemplateService";

/**
 * Create a new job template
 */
export async function createJobTemplate(input: CreateJobTemplateInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedInput = createJobTemplateSchema.parse(input);

    // Create template
    const template = await jobTemplateService.createTemplate(
      validatedInput,
      userId
    );

    return { success: true, data: template };
  } catch (error) {
    console.error("Error creating job template:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create job template" };
  }
}

/**
 * Get all job templates for current user
 */
export async function getJobTemplates() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const templates = await jobTemplateService.getTemplates(userId);

    return { success: true, data: templates };
  } catch (error) {
    console.error("Error fetching job templates:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch job templates" };
  }
}

/**
 * Get single job template by ID
 */
export async function getJobTemplateById(templateId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const template = await jobTemplateService.getTemplateById(
      templateId,
      userId
    );

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: template };
  } catch (error) {
    console.error("Error fetching job template:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch job template" };
  }
}

/**
 * Update job template
 */
export async function updateJobTemplate(input: UpdateJobTemplateInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedInput = updateJobTemplateSchema.parse(input);

    // Update template
    const template = await jobTemplateService.updateTemplate(
      validatedInput,
      userId
    );

    return { success: true, data: template };
  } catch (error) {
    console.error("Error updating job template:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update job template" };
  }
}

/**
 * Delete job template
 */
export async function deleteJobTemplate(templateId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await jobTemplateService.deleteTemplate(templateId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error deleting job template:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete job template" };
  }
}

/**
 * Get templates by category
 */
export async function getJobTemplatesByCategory(category: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const templates = await jobTemplateService.getTemplatesByCategory(
      category,
      userId
    );

    return { success: true, data: templates };
  } catch (error) {
    console.error("Error fetching job templates by category:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch job templates" };
  }
}
