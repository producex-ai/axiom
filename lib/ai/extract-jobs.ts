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
    userPrompt: `Extract ALL rows from ALL pages of the table(s) in this document.

CRITICAL - MULTI-PAGE DOCUMENTS:
- This document may span MULTIPLE PAGES (1-20+ pages)
- Extract rows from EVERY PAGE, not just the first page
- Continue extracting until you reach the end of the document
- Look for the same table structure continuing across pages
- Page breaks should NOT stop extraction - keep going!

CRITICAL - COLUMN HEADER DETECTION:
- Find the FIRST ROW that contains column labels/headers (usually bold or at the top of the table)
- Use the EXACT text from these headers as column names
- Common headers to look for: #, Location, Description, Quantity, etc.
- Column headers may repeat on each page - use the FIRST occurrence
- Do NOT merge or combine column names
- Do NOT duplicate column names
- Each column must have a UNIQUE name

IMPORTANT - TABLE STRUCTURE:
- Skip any title rows above the column headers
- Extract ALL DATA ROWS below the header row FROM ALL PAGES
- Each row should be a JSON object with column names as keys
- Preserve exact values from cells (don't modify dates, numbers, text)
- Include empty/null values if cells are blank
- If multiple tables exist, extract from the MAIN/LARGEST table
- Ignore document headers, footers, page numbers, logos
- If headers repeat on each page, skip them and continue with data rows

IMPORTANT - VALUE PRESERVATION:
- Keep dates in their original format (e.g., "03/09/2024", "2024-03-09")
- Keep numbers as they appear (with units if present)
- Preserve special characters and formatting
- Empty cells should be empty string "" or omitted

IMPORTANT - COLUMN NAMES:
- Return UNIQUE column names in the "columns" array
- Column names must match EXACTLY with keys in row objects
- No duplicate column names allowed

Example for a multi-page document with columns: #, Location, Description, Quantity, Glass/Brittle?

If Page 1 has rows 1-5 and Page 2 has rows 6-10, your output should include ALL 10 rows:

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
    },
    ... continue for rows 3-10 from all pages ...
  ]
}

REMEMBER: Extract ALL rows from ALL pages. Do not stop at page 1.

Return ONLY valid JSON with UNIQUE column names, no other text or formatting.`,
    systemPrompt:
      "You are a data extraction assistant for warehouse and facility operations. Your job is to extract tabular data from documents into structured JSON. CRITICAL: Process ALL pages of the document - do not stop at page 1. Each column must have a UNIQUE name - never duplicate column names. Focus on the main table in the document and preserve all values exactly as they appear. Ignore peripheral content like headers, footers, and metadata. When a table spans multiple pages, extract ALL rows from ALL pages. You must respond with ONLY valid JSON, nothing else.",
  };
}

/**
 * First pass: Analyze document to understand its structure
 */
async function analyzeDocumentStructure(
  client: BedrockRuntimeClient,
  contentBlock: any
): Promise<{ pageCount: number; estimatedRows: number }> {
  const analysisPrompt = `Analyze this document and tell me:
1. How many pages does it contain?
2. Approximately how many data rows (excluding headers) are in the table?

Look through ALL pages and count ALL rows. Respond with ONLY a JSON object:
{
  "pageCount": <number>,
  "estimatedRows": <number>
}`;

  const command = new ConverseCommand({
    modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages: [
      {
        role: "user",
        content: [contentBlock, { text: analysisPrompt }],
      },
    ],
    inferenceConfig: {
      temperature: 0.1,
      maxTokens: 1000,
    },
  });

  try {
    const response = await client.send(command);
    const outputText = response.output?.message?.content?.[0]?.text;
    if (!outputText) {
      return { pageCount: 1, estimatedRows: 0 };
    }

    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : outputText;
    const parsed = JSON.parse(jsonStr);
    
    console.log("📊 Document analysis:", parsed);
    return {
      pageCount: parsed.pageCount || 1,
      estimatedRows: parsed.estimatedRows || 0,
    };
  } catch (error) {
    console.warn("⚠️ Could not analyze document structure:", error);
    return { pageCount: 1, estimatedRows: 0 };
  }
}

/**
 * Continuation extraction - extract remaining rows after initial pass
 */
async function extractRemainingRows(
  client: BedrockRuntimeClient,
  contentBlock: any,
  columns: string[],
  lastExtractedRows: Array<Record<string, any>>,
  expectedTotal: number,
  systemPrompt: string
): Promise<Array<Record<string, any>>> {
  console.log(`🔄 Continuation pass: Extracted ${lastExtractedRows.length}/${expectedTotal}, fetching remaining rows...`);

  // Get the last few rows as context
  const lastRows = lastExtractedRows.slice(-3);
  const lastRowContext = lastRows.map((row, idx) => 
    `Row ${lastExtractedRows.length - 3 + idx + 1}: ${JSON.stringify(row)}`
  ).join('\n');

  const continuationPrompt = `You previously extracted ${lastExtractedRows.length} rows from this document.
The document has approximately ${expectedTotal} total rows.

LAST EXTRACTED ROWS (for context):
${lastRowContext}

TASK: Extract ALL REMAINING rows that come AFTER the rows shown above.

CRITICAL INSTRUCTIONS:
- Continue from where you left off (after row ${lastExtractedRows.length})
- Do NOT re-extract rows you already got
- Extract ALL remaining rows until the end of the document
- Expected to extract approximately ${expectedTotal - lastExtractedRows.length} more rows
- Use the same columns: ${JSON.stringify(columns)}

Return JSON format:
{
  "columns": ${JSON.stringify(columns)},
  "rows": [
    ... ALL remaining rows from row ${lastExtractedRows.length + 1} onwards ...
  ]
}

Return ONLY valid JSON, no other text.`;

  try {
    const command = new ConverseCommand({
      modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      messages: [
        {
          role: "user",
          content: [contentBlock, { text: continuationPrompt }],
        },
      ],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        temperature: 0.1,
        maxTokens: 8000,
      },
    });

    const response = await client.send(command);
    const outputText = response.output?.message?.content?.[0]?.text;

    if (!outputText) {
      console.warn("⚠️ Continuation pass: No response from AI");
      return [];
    }

    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : outputText;
    const parsed = JobExtractionSchema.parse(JSON.parse(jsonStr));

    console.log(`✅ Continuation pass: Extracted ${parsed.rows.length} additional rows`);
    return parsed.rows;

  } catch (error) {
    console.error("❌ Continuation pass failed:", error);
    return [];
  }
}

/**
 * Smart extraction strategy for 8-12 page documents
 * 1. Try single-pass extraction first
 * 2. If incomplete, do continuation pass(es)
 */
async function extractWithContinuation(
  client: BedrockRuntimeClient,
  contentBlock: any,
  structure: { pageCount: number; estimatedRows: number },
  systemPrompt: string
): Promise<ExtractedJobData> {
  console.log(`📥 Smart extraction for ${structure.pageCount} page(s), ~${structure.estimatedRows} rows`);

  const { userPrompt } = getJobExtractionPrompt();
  
  // First pass: Try to get everything in one go
  console.log("📄 Pass 1: Attempting full extraction...");
  
  const enhancedPrompt = `${userPrompt}

CRITICAL CONTEXT:
- This document has ${structure.pageCount} page(s)
- Contains approximately ${structure.estimatedRows} total rows
- You MUST extract ALL ${structure.estimatedRows} rows from ALL ${structure.pageCount} pages

IMPORTANT: Prioritize QUANTITY over formatting
- Extract EVERY SINGLE row
- Use abbreviated values if needed to fit more rows
- Do NOT stop until you've extracted all rows from all pages

Return ONLY valid JSON with ALL rows.`;

  let command = new ConverseCommand({
    modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages: [
      {
        role: "user",
        content: [contentBlock, { text: enhancedPrompt }],
      },
    ],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      temperature: 0.1,
      maxTokens: 8000,
    },
  });

  let response = await client.send(command);
  let outputText = response.output?.message?.content?.[0]?.text;

  if (!outputText) {
    throw new Error("No response from AI");
  }

  let jsonMatch = outputText.match(/\{[\s\S]*\}/);
  let jsonStr = jsonMatch ? jsonMatch[0] : outputText;
  let parsed = JobExtractionSchema.parse(JSON.parse(jsonStr));

  console.log(`✅ Pass 1: Extracted ${parsed.rows.length}/${structure.estimatedRows} rows (${((parsed.rows.length / structure.estimatedRows) * 100).toFixed(0)}%)`);

  // Check if extraction is complete
  const completionRate = parsed.rows.length / structure.estimatedRows;
  
  // If we got >= 90% or if we have all expected rows, we're done
  if (completionRate >= 0.9 || parsed.rows.length >= structure.estimatedRows) {
    console.log("✅ Extraction complete in single pass!");
    return parsed;
  }

  // If we got < 90%, try continuation pass
  console.log(`⚠️ Only ${(completionRate * 100).toFixed(0)}% complete, attempting continuation pass...`);
  
  const additionalRows = await extractRemainingRows(
    client,
    contentBlock,
    parsed.columns,
    parsed.rows,
    structure.estimatedRows,
    systemPrompt
  );

  // Merge results
  const allRows = [...parsed.rows, ...additionalRows];
  console.log(`✅ Final result: ${allRows.length}/${structure.estimatedRows} rows (${((allRows.length / structure.estimatedRows) * 100).toFixed(0)}%)`);

  return {
    description: parsed.description,
    columns: parsed.columns,
    rows: allRows,
  };
}

/**
 * Multi-pass extraction for large documents (fallback method)
 * Extracts data page-by-page and merges results
 */
async function extractInMultiplePasses(
  client: BedrockRuntimeClient,
  contentBlock: any,
  structure: { pageCount: number; estimatedRows: number },
  systemPrompt: string
): Promise<ExtractedJobData> {
  const passesNeeded = structure.pageCount; // Process 1 page per pass for thoroughness
  console.log(`📚 Multi-pass extraction: ${passesNeeded} passes for ${structure.pageCount} pages`);

  const allRows: Array<Record<string, any>> = [];
  let columns: string[] = [];
  let description: string | null = null;

  for (let pass = 0; pass < passesNeeded; pass++) {
    const pageNumber = pass + 1;
    
    console.log(`📄 Pass ${pass + 1}/${passesNeeded}: Extracting page ${pageNumber}...`);

    const passPrompt = `Extract ALL table rows from page ${pageNumber} of this document.

${pass === 0 ? `
CRITICAL - COLUMN HEADER DETECTION (First Pass Only):
- Find the column headers at the top of the table (usually bold)
- Use the EXACT text from these headers as column names
- Each column must have a UNIQUE name
- Skip any title rows above the headers
` : `
CONTINUATION EXTRACTION:
- Continue with the SAME column structure as before: ${JSON.stringify(columns)}
- Extract ONLY the data rows from page ${pageNumber}
- Skip any repeated headers on this page
- If page ${pageNumber} repeats the header row, skip it and extract only data rows below it
`}

CRITICAL INSTRUCTIONS:
- This is page ${pageNumber} of ${structure.pageCount} total pages
- Extract EVERY SINGLE data row from page ${pageNumber}
- Do NOT skip any rows, even if they look similar or repetitive
- Do NOT stop until you reach the end of page ${pageNumber}
- Include rows with empty cells
- Include all rows even if some cells are blank

IMPORTANT:
- Look carefully at the ENTIRE page ${pageNumber}
- Count all rows and make sure you extract ALL of them
- If you see 15 rows on this page, extract all 15 rows
- Do not summarize or skip rows - extract EVERY SINGLE ONE

Return JSON format:
{
  ${pass === 0 ? '"description": "Brief document description",' : ''}
  "columns": ${pass === 0 ? '["column1", "column2", ...]' : JSON.stringify(columns)},
  "rows": [
    {"column1": "value", "column2": "value", ...},
    ... EVERY row from page ${pageNumber} ...
  ]
}

Return ONLY valid JSON, no other text.`;

    try {
      const command = new ConverseCommand({
        modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        messages: [
          {
            role: "user",
            content: [contentBlock, { text: passPrompt }],
          },
        ],
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 8000,
        },
      });

      const response = await client.send(command);
      const outputText = response.output?.message?.content?.[0]?.text;

      if (!outputText) {
        console.warn(`⚠️ Pass ${pass + 1}: No response from AI`);
        continue;
      }

      // Parse response
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : outputText;
      const parsed = JobExtractionSchema.parse(JSON.parse(jsonStr));

      // First pass: capture columns and description
      if (pass === 0) {
        columns = parsed.columns;
        description = parsed.description ?? null;
      }

      // Add rows from this pass
      const rowsExtracted = parsed.rows.length;
      allRows.push(...parsed.rows);
      
      console.log(`✅ Pass ${pass + 1}: Extracted ${rowsExtracted} rows from page ${pageNumber} (Total: ${allRows.length})`);

    } catch (error) {
      console.error(`❌ Pass ${pass + 1} failed:`, error);
      // Continue with next pass even if one fails
    }
  }

  return {
    description,
    columns,
    rows: allRows,
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

    // Step 1: Analyze document structure
    console.log("📊 Step 1: Analyzing document structure...");
    const structure = await analyzeDocumentStructure(client, contentBlock);
    console.log("📊 Document has", structure.pageCount, "page(s) and approximately", structure.estimatedRows, "row(s)");

    // Get system prompt
    const { systemPrompt } = getJobExtractionPrompt();

    // Step 2: Choose extraction strategy
    let parsed: z.infer<typeof JobExtractionSchema>;
    
    if (structure.pageCount > 15 || structure.estimatedRows > 150) {
      // Multi-pass page-by-page extraction for very large documents (>15 pages)
      console.log("📥 Using multi-pass page-by-page extraction (very large document)...");
      parsed = await extractInMultiplePasses(client, contentBlock, structure, systemPrompt);
    } else if (structure.pageCount > 1 || structure.estimatedRows > 20) {
      // Smart continuation extraction for typical documents (2-15 pages, 20-150 rows)
      console.log("📥 Using smart continuation extraction...");
      parsed = await extractWithContinuation(client, contentBlock, structure, systemPrompt);
    } else {
      // Single-pass extraction for small documents
      console.log("📥 Using single-pass extraction...");
      const { userPrompt } = getJobExtractionPrompt();
      
      const command = new ConverseCommand({
        modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        messages: [
          {
            role: "user",
            content: [contentBlock, { text: userPrompt }],
          },
        ],
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 8000,
        },
      });

      const response = await client.send(command);
      const outputText = response.output?.message?.content?.[0]?.text;

      if (!outputText) {
        return {
          success: false,
          error: "No response from AI",
        };
      }

      console.log("📝 Raw AI response:", outputText);

      try {
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
    }

    console.log("✅ Jobs extracted successfully", {
      rowCount: parsed.rows.length,
      columnCount: parsed.columns.length,
      hasDescription: !!parsed.description,
      columns: parsed.columns,
      expectedRows: structure.estimatedRows,
    });

    // Verify extraction completeness
    const extractionRate = structure.estimatedRows > 0 
      ? (parsed.rows.length / structure.estimatedRows) * 100 
      : 100;
    
    if (extractionRate < 80 && structure.estimatedRows > 10) {
      console.warn(
        `⚠️ WARNING: Expected ~${structure.estimatedRows} rows but extracted ${parsed.rows.length} (${extractionRate.toFixed(0)}%).`,
        "Extraction may be incomplete. Document has", structure.pageCount, "page(s)."
      );
    } else {
      console.log(`✅ Extraction appears complete: ${parsed.rows.length}/${structure.estimatedRows} rows (${extractionRate.toFixed(0)}%)`);
    }

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
