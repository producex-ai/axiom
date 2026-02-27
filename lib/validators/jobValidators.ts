import { z } from "zod";
import type { ScheduleFrequency } from "@/lib/cron/cron-utils";

// Field Types
export const fieldTypeSchema = z.enum([
  "text",
  "number",
  "date",
  "select",
  "textarea",
  "checkbox",
]);

export const fieldCategorySchema = z.enum(["creation", "action"]);

export const frequencySchema = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
]);

// Job Template Field Schema
export const jobTemplateFieldSchema = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  field_key: z.string().default(""), // Will be auto-generated if empty
  field_label: z.string().min(1, "Field label is required").max(255),
  field_type: fieldTypeSchema,
  field_category: fieldCategorySchema,
  is_required: z.boolean(),
  display_order: z.number().int().min(0),
  config_json: z.record(z.string(), z.any()),
});

// Create Job Template Schema
export const createJobTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(255),
  doc_num: z.string().optional(),
  sop: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(jobTemplateFieldSchema).min(1),
}).superRefine((data, ctx) => {
  // Validate that action fields have non-empty field_key (description)
  data.fields.forEach((field, index) => {
    if (field.field_category === "action" && (!field.field_key || field.field_key.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Description is required",
        path: ["fields", index, "field_key"],
      });
    }
  });
});

export type CreateJobTemplateInput = z.infer<typeof createJobTemplateSchema>;

// Update Job Template Schema
export const updateJobTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(255).optional(),
  doc_num: z.string().optional(),
  sop: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(jobTemplateFieldSchema).optional(),
});

export type UpdateJobTemplateInput = z.infer<typeof updateJobTemplateSchema>;

// Create Job Schema
export const createJobSchema = z.object({
  template_id: z.string().uuid(),
  assigned_to: z.string().min(1),
  frequency: frequencySchema,
  next_execution_date: z.string().or(z.date()),
  creation_field_values: z.record(z.string(), z.any()), // Dynamic fields as key-value pairs
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// Update Job Schema
export const updateJobSchema = z.object({
  id: z.string().uuid(),
  assigned_to: z.string().min(1).optional(),
  frequency: frequencySchema.optional(),
  next_execution_date: z.string().or(z.date()).optional(),
});

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

// Execute Job Action Schema
export const executeJobActionSchema = z.object({
  job_id: z.string().uuid(),
  notes: z.string().optional(),
  action_field_values: z.record(z.string(), z.any()), // Dynamic fields as key-value pairs
});

export type ExecuteJobActionInput = z.infer<typeof executeJobActionSchema>;

// Job Status Type
// UPCOMING: Execution window hasn't started yet (today < cycleStart)
// OPEN: Execution window is open, ready to execute (cycleStart <= today < cycleEnd, not executed)
// COMPLETED: Executed within current cycle window
// OVERDUE: Past execution deadline without being executed (today >= cycleEnd, not executed)
export const jobStatusSchema = z.enum([
  "UPCOMING",
  "OPEN",
  "COMPLETED",
  "OVERDUE",
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

// Get Jobs Query Schema
export const getJobsQuerySchema = z.object({
  status: jobStatusSchema.optional(),
  assigned_to: z.string().optional(),
  template_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetJobsQuery = z.infer<typeof getJobsQuerySchema>;

// Field Value Schema (for rendering dynamic fields)
export const fieldValueSchema = z.object({
  field_key: z.string(),
  field_label: z.string(),
  field_type: fieldTypeSchema,
  value: z.any(),
  is_required: z.boolean(),
  config: z.record(z.string(), z.any()).optional(),
});

export type FieldValue = z.infer<typeof fieldValueSchema>;

// Execution History Item Schema
export const executionHistoryItemSchema = z.object({
  id: z.string().uuid(),
  performed_by: z.string(),
  performed_at: z.string().or(z.date()),
  notes: z.string().nullable().optional(),
  action_values: z.array(
    z.object({
      field_key: z.string(),
      field_label: z.string(),
      field_type: fieldTypeSchema,
      value: z.any(),
    })
  ),
});

export type ExecutionHistoryItem = z.infer<typeof executionHistoryItemSchema>;

// Job Detail Response Schema
export const jobDetailSchema = z.object({
  job: z.object({
    id: z.string().uuid(),
    template_id: z.string().uuid(),
    template_version: z.number().int(),
    title: z.string(),
    assigned_to: z.string(),
    frequency: frequencySchema,
    next_execution_date: z.string().or(z.date()),
    created_by: z.string(),
    created_at: z.string().or(z.date()),
    updated_at: z.string().or(z.date()),
  }),
  template: z.object({
    name: z.string(),
    category: z.string(),
    description: z.string().nullable().optional(),
  }),
  creation_fields: z.array(fieldValueSchema),
  action_fields: z.array(
    z.object({
      field_key: z.string(),
      field_label: z.string(),
      field_type: fieldTypeSchema,
      is_required: z.boolean(),
      config: z.record(z.string(), z.any()).optional(),
    })
  ),
  execution_history: z.array(executionHistoryItemSchema),
  derived_status: jobStatusSchema,
});

export type JobDetail = z.infer<typeof jobDetailSchema>;

// Bulk Job Creation Schemas

// Field mapping for bulk import
export const fieldMappingSchema = z.object({
  documentColumn: z.string(),
  templateFieldKey: z.string(),
  templateFieldLabel: z.string(),
  fieldCategory: z.enum(["creation", "action"]),
  confidence: z.enum(["high", "medium", "low"]),
});

export type FieldMapping = z.infer<typeof fieldMappingSchema>;

// Extracted job row from document
export const extractedJobRowSchema = z.object({
  index: z.number().int().min(0),
  fields: z.record(z.string(), z.any()),
});

export type ExtractedJobRow = z.infer<typeof extractedJobRowSchema>;

// Bulk job creation input
export const bulkJobCreationSchema = z.object({
  templateId: z.string().uuid(),
  fieldMappings: z.array(fieldMappingSchema),
  jobs: z.array(createJobSchema),
});

export type BulkJobCreationInput = z.infer<typeof bulkJobCreationSchema>;

// Job extraction result
export const jobExtractionResultSchema = z.object({
  success: z.boolean(),
  description: z.string().optional(),
  columns: z.array(z.string()).optional(),
  rows: z.array(z.record(z.string(), z.any())).optional(),
  error: z.string().optional(),
});

export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;
