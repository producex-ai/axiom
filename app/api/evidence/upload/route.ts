/**
 * POST /api/evidence/upload
 * Upload 1-3 evidence documents for compliance analysis
 *
 * Request: multipart/form-data
 * - files: File[] (max 3)
 * - subModuleId: string
 *
 * Validation Rules:
 * - Total evidence (existing + new) must not exceed 3
 * - Only accept: .docx, .pdf
 * - Max file size: 10MB per file
 *
 * Process:
 * 1. Check existing evidence count
 * 2. Validate files
 * 3. Upload each to S3
 * 4. Extract text from file
 * 5. Upload extracted text to S3
 * 6. Create UploadedEvidence records
 * 7. Return uploaded evidence
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";
import { uploadToS3, extractTextFromDOCX } from "@/lib/s3-utils";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for upload and processing

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx only
];

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;

    // Parse multipart form data
    const formData = await request.formData();
    const filesFormData = formData.getAll("files") as File[];
    const subModuleId = formData.get("subModuleId") as string;

    if (!subModuleId) {
      return NextResponse.json(
        { error: "subModuleId is required" },
        { status: 400 },
      );
    }

    if (!filesFormData || filesFormData.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Check number of new files
    if (filesFormData.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files exceeded` },
        { status: 400 },
      );
    }

    // Get existing evidence count
    const existingResult = await query(
      `SELECT COUNT(*) as count FROM uploaded_evidence 
       WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL`,
      [orgId, subModuleId],
    );

    const existingCount = parseInt(existingResult.rows[0].count, 10);
    const totalCount = existingCount + filesFormData.length;

    if (totalCount > MAX_FILES) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_FILES} total evidence files exceeded`,
          details: `You already have ${existingCount} file(s), max ${MAX_FILES - existingCount} more allowed`,
        },
        { status: 400 },
      );
    }

    // Validate each file
    for (const file of filesFormData) {
      // Check mime type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: "Invalid file type",
            details: `${file.name} has invalid type. Only DOCX files allowed.`,
          },
          { status: 400 },
        );
      }

      // Check file extension
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext !== "docx") {
        return NextResponse.json(
          {
            error: "Invalid file extension",
            details: `${file.name} has invalid extension. Only .docx files allowed.`,
          },
          { status: 400 },
        );
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: "File too large",
            details: `${file.name} exceeds 10MB limit`,
          },
          { status: 413 },
        );
      }
    }

    console.log("[API] Uploading evidence files:", {
      orgId,
      userId,
      subModuleId,
      fileCount: filesFormData.length,
      fileNames: filesFormData.map((f) => f.name),
    });

    const uploadedEvidence: any[] = [];

    // Process each file
    for (const file of filesFormData) {
      try {
        const evidenceId = randomUUID();
        const timestamp = Date.now();
        const isDocx = file.type.includes("wordprocessingml");

        // Upload original file to S3
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileKey = `evidence/${subModuleId}/${timestamp}_${evidenceId}.docx`;

        await uploadToS3(file, fileKey);
        console.log(`[API] Uploaded original file: ${fileKey}`);

        // Extract text from file
        let extractedText: string;
        try {
          extractedText = await extractTextFromDOCX(fileBuffer);
        } catch (extractError) {
          console.error(
            `[API] Text extraction error for ${file.name}:`,
            extractError,
          );
          throw new Error(
            `Failed to extract text from ${file.name}: ${extractError instanceof Error ? extractError.message : "Unknown error"}`,
          );
        }

        console.log(
          `[API] Extracted text from ${file.name} (${extractedText.length} chars)`,
        );

        // Upload extracted text to S3
        const extractedTextKey = `evidence/${subModuleId}/extracted/${timestamp}_${evidenceId}.txt`;
        const textBlob = new Blob([extractedText], { type: "text/plain" });
        await uploadToS3(textBlob, extractedTextKey);
        console.log(`[API] Uploaded extracted text: ${extractedTextKey}`);

        // Create UploadedEvidence record in database
        await query(
          `INSERT INTO uploaded_evidence 
           (id, org_id, sub_module_id, filename, file_key, extracted_text_key, file_size, file_type, uploaded_by, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            evidenceId,
            orgId,
            subModuleId,
            file.name,
            fileKey,
            extractedTextKey,
            file.size,
            isDocx ? "docx" : "pdf",
            userId,
            new Date().toISOString(),
          ],
        );

        console.log(`[API] Created evidence record: ${evidenceId}`);

        uploadedEvidence.push({
          id: evidenceId,
          fileName: file.name,
          fileKey,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
        });
      } catch (fileError) {
        console.error(`[API] Error processing file ${file.name}:`, fileError);
        throw fileError;
      }
    }

    console.log(
      `[API] ✅ Successfully uploaded ${uploadedEvidence.length} evidence file(s)`,
    );

    return NextResponse.json(
      {
        success: true,
        uploadedEvidence,
        message: `${uploadedEvidence.length} file(s) uploaded successfully`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error uploading evidence:", error);

    return NextResponse.json(
      {
        error: "Failed to upload evidence",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
