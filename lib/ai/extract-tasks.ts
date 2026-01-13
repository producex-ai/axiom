"use server";

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

import { getFromS3, uploadToS3 } from "@/lib/s3-utils";

// Define the schema for extracted tasks
const TaskListSchema = z.object({
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

export type ExtractedTasks = z.infer<typeof TaskListSchema>;

export interface ExtractTasksResult {
  success: boolean;
  tasks?: string[];
  error?: string;
}

/**
 * Upload file and extract tasks from it using AI
 */
export async function uploadAndExtractTasks(
  file: File,
): Promise<ExtractTasksResult> {
  console.log("🚀 Upload and extract started", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  try {
    // Upload file to S3
    const s3Key = `temp/templates/${Date.now()}-${file.name}`;
    console.log("📤 Uploading file to S3:", s3Key);
    await uploadToS3(file, s3Key);

    // Extract tasks from the uploaded file
    return await extractTasksFromDocument({
      s3Key,
      fileType: file.type,
    });
  } catch (error) {
    console.error("❌ Upload and extract error:", error);
    return {
      success: false,
      error: "Failed to upload and extract tasks. Please try again.",
    };
  }
}

interface ExtractTasksOptions {
  s3Key: string;
  fileType: string;
}

/**
 * Extract tasks from a document already in S3 using AI
 */
async function extractTasksFromDocument({
  s3Key,
  fileType,
}: ExtractTasksOptions): Promise<ExtractTasksResult> {
  console.log("🚀 Task extraction started", { s3Key, fileType });

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

    console.log("🤖 Calling Bedrock to extract tasks", {
      fileType,
      size: fileContent.length,
    });

    // Call Bedrock Converse API
    const command = new ConverseCommand({
      modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              text: 'Extract ALL operational tasks from this document exactly as they appear. DO NOT modify, paraphrase, merge, or remove any tasks. Return every single task you find.\n\nIMPORTANT:\n- If this is a table, tasks are typically in the FIRST COLUMN\n- Keep the exact wording from the document\n- Do not combine multiple tasks into one\n- Do not skip any tasks\n- Return tasks in the order they appear\n\nReturn ONLY a valid JSON object with this exact structure: {"tasks": [{"description": "exact task text 1"}, {"description": "exact task text 2"}]}. No other text or formatting.',
            },
          ],
        },
      ],
      system: [
        {
          text: "You are a task extraction assistant for warehouse and facility operations. Your job is to extract tasks EXACTLY as written without any modifications. Preserve the original text completely. You must respond with ONLY valid JSON, nothing else.",
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

    // Parse JSON response
    const ResponseSchema = z.object({
      tasks: z.array(
        z.object({
          description: z.string(),
        }),
      ),
    });

    let parsed: z.infer<typeof ResponseSchema>;
    try {
      // Try to extract JSON if there's any markdown formatting
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : outputText;
      parsed = ResponseSchema.parse(JSON.parse(jsonStr));
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      return {
        success: false,
        error: "Failed to parse AI response",
      };
    }

    console.log("✅ Tasks extracted successfully", {
      taskCount: parsed.tasks.length,
    });

    // Map to string array
    const tasks = parsed.tasks.map((t) => t.description);

    return {
      success: true,
      tasks,
    };
  } catch (error) {
    console.error("❌ Task extraction error:", error);
    return {
      success: false,
      error: "Failed to extract tasks. Please try again.",
    };
  }
}
