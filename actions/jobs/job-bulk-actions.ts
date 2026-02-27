"use server";

import { auth } from "@clerk/nextjs/server";
import {
  bulkJobCreationSchema,
  type BulkJobCreationInput,
  type FieldMapping,
} from "@/lib/validators/jobValidators";
import * as jobService from "@/lib/services/jobService";
import * as jobTemplateService from "@/lib/services/jobTemplateService";
import * as jobExtractionService from "@/lib/services/jobExtractionService";
import { uploadAndExtractJobs } from "@/lib/ai/extract-jobs";

/**
 * Upload document and extract jobs from it
 */
export async function uploadAndExtractJobsAction(formData: FormData) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const templateId = formData.get("templateId") as string;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!templateId) {
      return { success: false, error: "No template selected" };
    }

    // Get template to validate it exists
    const template = await jobTemplateService.getTemplateById(templateId, orgId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Extract jobs from document
    const extractionResult = await uploadAndExtractJobs(file);

    if (!extractionResult.success || !extractionResult.rows) {
      return {
        success: false,
        error: extractionResult.error || "Failed to extract data from document",
      };
    }

    // Suggest field mappings
    const suggestedMappings = await jobExtractionService.suggestFieldMappings(
      templateId,
      extractionResult.columns || [],
      orgId
    );

    // Validate extraction
    const validation = jobExtractionService.validateExtraction(
      template,
      extractionResult.columns || [],
      suggestedMappings
    );

    return {
      success: true,
      data: {
        description: extractionResult.description,
        columns: extractionResult.columns,
        rows: extractionResult.rows,
        suggestedMappings,
        validation,
        template: {
          id: template.id,
          name: template.name,
          category: template.category,
          fields: template.fields, // Include fields for dropdown
        },
      },
    };
  } catch (error) {
    console.error("Error in uploadAndExtractJobsAction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to extract jobs from document" };
  }
}

/**
 * Get suggested field mappings for extracted columns
 */
export async function suggestFieldMappingsAction(
  templateId: string,
  extractedColumns: string[]
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return { success: false, error: "Unauthorized" };
    }

    const mappings = await jobExtractionService.suggestFieldMappings(
      templateId,
      extractedColumns,
      orgId
    );

    return { success: true, data: mappings };
  } catch (error) {
    console.error("Error in suggestFieldMappingsAction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to suggest field mappings" };
  }
}

/**
 * Create multiple jobs from extracted data
 */
export async function createBulkJobsAction(input: BulkJobCreationInput) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedInput = bulkJobCreationSchema.parse(input);

    // Get template
    const template = await jobTemplateService.getTemplateById(
      validatedInput.templateId,
      orgId
    );

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Validate each job's required fields
    const creationFields = template.fields.filter(
      (f) => f.field_category === "creation"
    );

    const validationErrors: Array<{ index: number; errors: string[] }> = [];

    for (let i = 0; i < validatedInput.jobs.length; i++) {
      const job = validatedInput.jobs[i];
      const errors: string[] = [];

      for (const field of creationFields) {
        if (field.is_required) {
          const value = job.creation_field_values[field.field_key];
          if (value === undefined || value === null || value === "") {
            errors.push(`Field "${field.field_label}" is required`);
          }
        }
      }

      if (errors.length > 0) {
        validationErrors.push({ index: i, errors });
      }
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: "Some jobs have validation errors",
        validationErrors,
      };
    }

    // Create jobs in bulk
    const result = await jobService.createBulkJobs(
      validatedInput.jobs,
      userId,
      orgId
    );

    return {
      success: true,
      data: {
        totalAttempted: result.totalAttempted,
        totalCreated: result.totalCreated,
        created: result.created,
        failed: result.failed,
      },
    };
  } catch (error) {
    console.error("Error in createBulkJobsAction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create jobs" };
  }
}

/**
 * Apply field mappings to extracted rows and get mapped jobs
 */
export async function applyFieldMappingsAction(
  templateId: string,
  extractedRows: Array<Record<string, any>>,
  fieldMappings: FieldMapping[]
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get template
    const template = await jobTemplateService.getTemplateById(templateId, orgId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Apply mappings
    const mappedJobs = jobExtractionService.applyFieldMappings(
      extractedRows,
      fieldMappings,
      template
    );

    return { success: true, data: mappedJobs };
  } catch (error) {
    console.error("Error in applyFieldMappingsAction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to apply field mappings" };
  }
}
