"use server";

import { auth } from "@clerk/nextjs/server";
import {
  createJobSchema,
  updateJobSchema,
  executeJobActionSchema,
  type CreateJobInput,
  type UpdateJobInput,
  type ExecuteJobActionInput,
  type JobStatus,
} from "@/lib/validators/jobValidators";
import * as jobService from "@/lib/services/jobService";
import * as jobTemplateService from "@/lib/services/jobTemplateService";

/**
 * Create a new job from template
 */
export async function createJob(input: CreateJobInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedInput = createJobSchema.parse(input);

    // Validate creation fields against template
    const template = await jobTemplateService.getTemplateById(
      validatedInput.template_id,
      userId
    );

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Validate required creation fields
    const creationFields = template.fields.filter(
      (f: jobTemplateService.JobTemplateField) => f.field_category === "creation"
    );

    for (const field of creationFields) {
      if (field.is_required) {
        const value = validatedInput.creation_field_values[field.field_key];
        if (value === undefined || value === null || value === "") {
          return {
            success: false,
            error: `Field "${field.field_label}" is required`,
          };
        }
      }
    }

    // Create job
    const job = await jobService.createJob(validatedInput, userId);

    return { success: true, data: job };
  } catch (error) {
    console.error("Error creating job:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create job" };
  }
}

/**
 * Get all jobs for current user
 */
export async function getJobs(filters?: {
  assigned_to?: string;
  template_id?: string;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const jobs = await jobService.getJobs(userId, filters);

    return { success: true, data: jobs };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch jobs" };
  }
}

/**
 * Get jobs with derived status
 */
export async function getJobsWithStatus(statusFilter?: JobStatus) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const jobs = await jobService.getJobsWithStatus(userId, statusFilter);

    return { success: true, data: jobs };
  } catch (error) {
    console.error("Error fetching jobs with status:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch jobs" };
  }
}

/**
 * Get single job by ID with full details
 */
export async function getJobById(jobId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const job = await jobService.getJobById(jobId, userId);

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    return { success: true, data: job };
  } catch (error) {
    console.error("Error fetching job:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch job" };
  }
}

/**
 * Update job
 */
export async function updateJob(input: UpdateJobInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedInput = updateJobSchema.parse(input);

    // Update job
    const job = await jobService.updateJob(validatedInput, userId);

    return { success: true, data: job };
  } catch (error) {
    console.error("Error updating job:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update job" };
  }
}

/**
 * Delete job
 */
export async function deleteJob(jobId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await jobService.deleteJob(jobId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error deleting job:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete job" };
  }
}

/**
 * Execute job action (create execution history entry)
 */
export async function executeJobAction(input: ExecuteJobActionInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedInput = executeJobActionSchema.parse(input);

    // Execute action
    const action = await jobService.executeJobAction(validatedInput, userId);

    return { success: true, data: action };
  } catch (error) {
    console.error("Error executing job action:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to execute job action" };
  }
}

/**
 * Get jobs and execution history for a specific template
 */
export async function getJobsByTemplateId(templateId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await jobService.getJobsByTemplateId(templateId, userId);

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching jobs for template:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to fetch jobs for template" };
  }
}

