"use server";

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

import { getFromS3, uploadToS3 } from "@/lib/utils/s3";

// Schema for job extraction from tabular documents
const JobExtractionSchema = z.object({
  description: z
    .string()
    .nullish()
    .describe("Optional description or context for the document"),
  columns: z
    .array(z.string())
    .describe("Column headers detected in the document"),
  rows: z.array(z.record(z.string(), z.any())).describe("Data rows as objects"),
});

export type ExtractedJobData = z.infer<typeof JobExtractionSchema>;

export interface ExtractJobsResult {
  success: boolean;
  description?: string;
  columns?: string[];
  rows?: Array<Record<string, any>>;
  error?: string;
}

/**
 * Upload file and extract job data from it using AI
 * Similar to uploadAndExtractTasks but for tabular/job data
 */
export async function uploadAndExtractJobs(
  file: File,
): Promise<ExtractJobsResult> {
  console.log("🚀 Upload and extract jobs started", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  try {
    // Upload file to S3
    const s3Key = `temp/job-imports/${Date.now()}-${file.name}`;
    console.log("📤 Uploading file to S3:", s3Key);
    await uploadToS3(file, s3Key);

    // Extract jobs from the uploaded file
    return await extractJobsFromDocument({
      s3Key,
      fileType: file.type,
    });
  } catch (error) {
    console.error("❌ Upload and extract error:", error);
    return {
      success: false,
      error: "Failed to upload and extract. Please try again.",
    };
  }
}

interface ExtractJobsOptions {
  s3Key: string;
  fileType: string;
}

/**
 * Get the appropriate prompt for job extraction
 */
function getJobExtractionPrompt(): {
  userPrompt: string;
  systemPrompt: string;
} {
  return {
    userPrompt: `Extract ALL rows from the table(s) in this document.

CRITICAL - COLUMN HEADER DETECTION:
- Find the FIRST ROW that contains column labels/headers (usually bold or at the top of the table)
- Use the EXACT text from these headers as column names
- Common headers to look for: #, Location, Description, Quantity, etc.
- Do NOT merge or combine column names
- Do NOT duplicate column names
- Each column must have a UNIQUE name

IMPORTANT - TABLE STRUCTURE:
- Skip any title rows above the column headers
- Extract ALL DATA ROWS below the header row
- Each row should be a JSON object with column names as keys
- Preserve exact values from cells (don't modify dates, numbers, text)
- Include empty/null values if cells are blank
- If multiple tables exist, extract from the MAIN/LARGEST table
- Ignore document headers, footers, page numbers, logos

IMPORTANT - VALUE PRESERVATION:
- Keep dates in their original format (e.g., "03/09/2024", "2024-03-09")
- Keep numbers as they appear (with units if present)
- Preserve special characters and formatting
- Empty cells should be empty string "" or omitted

IMPORTANT - COLUMN NAMES:
- Return UNIQUE column names in the "columns" array
- Column names must match EXACTLY with keys in row objects
- No duplicate column names allowed

Example for a table with columns: #, Location, Description, Quantity, Glass/Brittle?
{
  "description": "Brittle Item Inspection Checklist",
  "columns": ["#", "Location", "Description", "Quantity", "Glass/Brittle?"],
  "rows": [
    {
      "#": "1",
      "Location": "Production Area",
      "Description": "Paper towel dispensers",
      "Quantity": "3",
      "Glass/Brittle?": "Brittle"
    },
    {
      "#": "2",
      "Location": "Production Area",
      "Description": "Soap Dispensers",
      "Quantity": "2",
      "Glass/Brittle?": "Brittle"
    }
  ]
}

Return ONLY valid JSON with UNIQUE column names, no other text or formatting.`,
    systemPrompt:
      "You are a data extraction assistant for warehouse and facility operations. Your job is to extract tabular data from documents into structured JSON. CRITICAL: Each column must have a UNIQUE name - never duplicate column names. Focus on the main table in the document and preserve all values exactly as they appear. Ignore peripheral content like headers, footers, and metadata. You must respond with ONLY valid JSON, nothing else.",
  };
}

/**
 * Extract jobs from a document already in S3 using AI
 */
async function extractJobsFromDocument({
  s3Key,
  fileType,
}: ExtractJobsOptions): Promise<ExtractJobsResult> {
  console.log("🚀 Job extraction started", { s3Key, fileType });

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
      // Sanitize filename
      const rawName = s3Key.split("/").pop() || "document.pdf";
      const sanitizedName = rawName
        .replace(/[^a-zA-Z0-9\s\-()[\]]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

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
      // Word document
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
      fileType.includes("spreadsheetml") ||
      fileType.includes("excel") ||
      s3Key.toLowerCase().endsWith(".xlsx") ||
      s3Key.toLowerCase().endsWith(".xls")
    ) {
      // Excel - treat as document
      const rawName = s3Key.split("/").pop() || "document.xlsx";
      const sanitizedName = rawName
        .replace(/[^a-zA-Z0-9\s\-()[\]]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

      // Excel files are best handled as CSV conversion or direct parsing
      // For now, treat as document and let Bedrock extract
      const format = s3Key.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";

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
      fileType.includes("csv") ||
      s3Key.toLowerCase().endsWith(".csv")
    ) {
      // CSV as text
      contentBlock = {
        text: fileContent.toString("utf-8"),
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

    console.log("🤖 Calling Bedrock to extract job data", {
      fileType,
      size: fileContent.length,
    });

    // Get prompts
    const { userPrompt, systemPrompt } = getJobExtractionPrompt();

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

    // Parse JSON response
    let parsed: z.infer<typeof JobExtractionSchema>;
    try {
      // Try to extract JSON if there's any markdown formatting
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : outputText;
      parsed = JobExtractionSchema.parse(JSON.parse(jsonStr));
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      return {
        success: false,
        error: "Failed to parse AI response",
      };
    }

    console.log("✅ Jobs extracted successfully", {
      rowCount: parsed.rows.length,
      columnCount: parsed.columns.length,
      hasDescription: !!parsed.description,
    });

    return {
      success: true,
      description: parsed.description ?? undefined,
      columns: parsed.columns,
      rows: parsed.rows,
    };
  } catch (error) {
    console.error("❌ Extraction error:", error);
    return {
      success: false,
      error: "Failed to extract data. Please try again.",
    };
  }
}
