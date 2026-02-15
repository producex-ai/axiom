"use server";

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

import type { TemplateType } from "@/db/queries/log-templates";
import { getFromS3, uploadToS3 } from "@/lib/s3-utils";

// Schema for task list extraction
const TaskListSchema = z.object({
  description: z
    .string()
    .nullish()
    .describe("Optional description or context for the entire template"),
  tasks: z.array(
    z.object({
      description: z
        .string()
        .describe(
          "Clear, actionable task description for warehouse/facility operations",
        ),
    }),
  ),
});

// Schema for field input extraction
const FieldInputSchema = z.object({
  description: z
    .string()
    .nullish()
    .describe("Optional description or context for the entire template"),
  fields: z.array(
    z.object({
      name: z.string().describe("Field name or label"),
      description: z
        .string()
        .nullish()
        .describe("Optional hint or guidance for this field"),
      required: z.boolean().describe("Whether this field is required"),
    }),
  ),
});

export type ExtractedTasks = z.infer<typeof TaskListSchema>;
export type ExtractedFields = z.infer<typeof FieldInputSchema>;

export interface ExtractTasksResult {
  success: boolean;
  description?: string;
  tasks?: string[];
  fields?: Array<{ name: string; description?: string; required: boolean }>;
  error?: string;
}

/**
 * Upload file and extract tasks or fields from it using AI
 */
export async function uploadAndExtractTasks(
  file: File,
  templateType: TemplateType = "task_list",
): Promise<ExtractTasksResult> {
  console.log("🚀 Upload and extract started", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    templateType,
  });

  try {
    // Upload file to S3
    const s3Key = `temp/templates/${Date.now()}-${file.name}`;
    console.log("📤 Uploading file to S3:", s3Key);
    await uploadToS3(file, s3Key);

    // Extract tasks or fields from the uploaded file
    return await extractTasksFromDocument({
      s3Key,
      fileType: file.type,
      templateType,
    });
  } catch (error) {
    console.error("❌ Upload and extract error:", error);
    return {
      success: false,
      error: "Failed to upload and extract. Please try again.",
    };
  }
}

interface ExtractTasksOptions {
  s3Key: string;
  fileType: string;
  templateType: TemplateType;
}

/**
 * Get the appropriate prompt and system message based on template type
 */
function getPromptForTemplateType(templateType: TemplateType): {
  userPrompt: string;
  systemPrompt: string;
} {
  if (templateType === "task_list") {
    return {
      userPrompt: `Extract ALL operational tasks from this document exactly as they appear. DO NOT modify, paraphrase, merge, or remove any tasks. Return every single task you find.

IMPORTANT:
- If this is a table, tasks are typically in the FIRST COLUMN
- Keep the exact wording from the document
- Do not combine multiple tasks into one
- Do not skip any tasks
- Return tasks in the order they appear
- Extract an overall description if the document contains one (look in headers, introductions, or summary sections)

Return ONLY a valid JSON object with this exact structure: 
{
  "description": "optional overall description of what this checklist/template is for",
  "tasks": [
    {"description": "exact task text 1"}, 
    {"description": "exact task text 2"}
  ]
}

No other text or formatting.`,
      systemPrompt:
        "You are a task extraction assistant for warehouse and facility operations. Your job is to extract tasks EXACTLY as written without any modifications. Preserve the original text completely. Also extract any overall description or purpose statement for the template. You must respond with ONLY valid JSON, nothing else.",
    };
  } else {
    // field_input type
    return {
      userPrompt: `Extract ALL data fields or information items from this document. These are typically labels, field names, or data points that someone would need to fill in.

IMPORTANT - FOCUS ON TABLES:
- **PRIMARY FOCUS**: Extract fields from the MAIN TABLE(S) in the document body
- **IGNORE**: Headers, footers, page numbers, document titles, logos, and surrounding text
- If this is a table-based document, fields are typically in column headers or the first column
- Extract field names/labels exactly as they appear in the table
- For each field, try to determine if there's a description, hint, or example provided in adjacent columns
- Determine if the field appears to be required (look for asterisks, "required" text, or mandatory indicators)
- Extract an overall description if the document contains one (look for introductions or summary sections within the main content)
- Do not skip any table fields/rows
- Return fields in the order they appear in the table

Return ONLY a valid JSON object with this exact structure:
{
  "description": "optional overall description of what this form/template is for",
  "fields": [
    {
      "name": "Field name or label from table",
      "description": "optional hint or guidance",
      "required": true
    }
  ]
}

No other text or formatting.`,
      systemPrompt:
        "You are a field extraction assistant for warehouse and facility operations. Your job is to extract form fields, data labels, and input requirements from documents, focusing primarily on tabular data. Ignore headers, footers, and peripheral content. Preserve the original field names from tables completely. Also extract any overall description or purpose statement for the template from the main content area. You must respond with ONLY valid JSON, nothing else.",
    };
  }
}

/**
 * Extract tasks or fields from a document already in S3 using AI
 */
async function extractTasksFromDocument({
  s3Key,
  fileType,
  templateType,
}: ExtractTasksOptions): Promise<ExtractTasksResult> {
  console.log("🚀 Extraction started", { s3Key, fileType, templateType });

  try {
    // Validate AWS configuration
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error("❌ Missing AWS configuration");
      return {
        success: false,
        error: "Missing AWS configuration",
      };
    }

    // Get file from S3
    console.log("📥 Downloading file from S3");
    const fileContent = await getFromS3(s3Key);

    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Prepare content based on file type
    let contentBlock: any;

    if (fileType.includes("pdf")) {
      // Sanitize filename - only alphanumeric, whitespace, hyphens, parentheses, square brackets
      // No consecutive whitespace
      const rawName = s3Key.split("/").pop() || "document.pdf";
      const sanitizedName = rawName
        .replace(/[^a-zA-Z0-9\s\-()[\]]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

      // PDF as document
      contentBlock = {
        document: {
          format: "pdf",
          name: sanitizedName,
          source: {
            bytes: fileContent,
          },
        },
      };
    } else if (
      fileType.includes("wordprocessingml") ||
      fileType.includes("msword") ||
      s3Key.toLowerCase().endsWith(".docx") ||
      s3Key.toLowerCase().endsWith(".doc")
    ) {
      // Word document - use document block
      const rawName = s3Key.split("/").pop() || "document.docx";
      const sanitizedName = rawName
        .replace(/[^a-zA-Z0-9\s\-()[\]]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

      const format = s3Key.toLowerCase().endsWith(".doc") ? "doc" : "docx";

      contentBlock = {
        document: {
          format,
          name: sanitizedName,
          source: {
            bytes: fileContent,
          },
        },
      };
    } else if (
      fileType.includes("png") ||
      fileType.includes("jpg") ||
      fileType.includes("jpeg")
    ) {
      // Image
      const format = fileType.includes("png") ? "png" : "jpeg";
      contentBlock = {
        image: {
          format,
          source: {
            bytes: fileContent,
          },
        },
      };
    } else {
      // Text-based files
      contentBlock = {
        text: fileContent.toString("utf-8"),
      };
    }

    console.log("🤖 Calling Bedrock to extract data", {
      fileType,
      size: fileContent.length,
      templateType,
    });

    // Get appropriate prompts for the template type
    const { userPrompt, systemPrompt } = getPromptForTemplateType(templateType);

    // Call Bedrock Converse API
    const command = new ConverseCommand({
      modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              text: userPrompt,
            },
          ],
        },
      ],
      system: [
        {
          text: systemPrompt,
        },
      ],
      inferenceConfig: {
        temperature: 0.1,
      },
    });

    const response = await client.send(command);

    // Extract text from response
    const outputText = response.output?.message?.content?.[0]?.text;

    if (!outputText) {
      return {
        success: false,
        error: "No response from AI",
      };
    }

    console.log("📝 Raw AI response:", outputText);

    // Parse JSON response based on template type
    if (templateType === "task_list") {
      let parsed: z.infer<typeof TaskListSchema>;
      try {
        // Try to extract JSON if there's any markdown formatting
        const jsonMatch = outputText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : outputText;
        parsed = TaskListSchema.parse(JSON.parse(jsonStr));
      } catch (parseError) {
        console.error("❌ Failed to parse AI response:", parseError);
        return {
          success: false,
          error: "Failed to parse AI response",
        };
      }

      console.log("✅ Tasks extracted successfully", {
        taskCount: parsed.tasks.length,
        hasDescription: !!parsed.description,
      });

      // Map to string array
      const tasks = parsed.tasks.map((t) => t.description);

      return {
        success: true,
        description: parsed.description ?? undefined,
        tasks,
      };
    } else {
      // field_input type
      let parsed: z.infer<typeof FieldInputSchema>;
      try {
        // Try to extract JSON if there's any markdown formatting
        const jsonMatch = outputText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : outputText;
        parsed = FieldInputSchema.parse(JSON.parse(jsonStr));
      } catch (parseError) {
        console.error("❌ Failed to parse AI response:", parseError);
        return {
          success: false,
          error: "Failed to parse AI response",
        };
      }

      console.log("✅ Fields extracted successfully", {
        fieldCount: parsed.fields.length,
        hasDescription: !!parsed.description,
      });

      return {
        success: true,
        description: parsed.description ?? undefined,
        fields: parsed.fields.map((field) => ({
          name: field.name,
          description: field.description ?? undefined,
          required: field.required,
        })),
      };
    }
  } catch (error) {
    console.error("❌ Extraction error:", error);
    return {
      success: false,
      error: "Failed to extract data. Please try again.",
    };
  }
}
