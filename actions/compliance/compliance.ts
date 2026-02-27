"use server";

/**
 * Evidence Management Server Actions
 *
 * Handles all evidence-related operations:
 * - Upload files
 * - Delete evidence
 * - Fetch evidence
 */

import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { query } from "@/lib/db/postgres";
import {
  uploadToS3,
  extractTextFromDOCX,
  deleteFromS3,
  getFromS3,
} from "@/lib/utils/s3";
import {
  ActionResponse,
  ValidationError,
  AuthenticationError,
  ServerError,
  createErrorResponse,
  createSuccessResponse,
} from "../utils";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
];

/**
 * Get auth context from server action
 */
async function getAuthContext(): Promise<{ orgId: string; userId: string }> {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      throw new AuthenticationError();
    }

    if (!orgId) {
      throw new AuthenticationError();
    }

    return {
      orgId,
      userId,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError();
  }
}

/**
 * Upload evidence files for a submodule
 *
 * @param files - Files to upload
 * @param subModuleId - SubModule ID
 * @returns Array of uploaded evidence
 */
export async function uploadEvidenceAction(
  files: File[],
  subModuleId: string,
): Promise<ActionResponse> {
  try {
    // Authenticate
    const { orgId, userId } = await getAuthContext();

    // Validate input
    if (!files || files.length === 0) {
      throw new ValidationError("No files provided");
    }

    if (!subModuleId) {
      throw new ValidationError("subModuleId is required");
    }

    if (files.length > MAX_FILES) {
      throw new ValidationError(`Maximum ${MAX_FILES} files exceeded`);
    }

    console.log("[SERVER ACTION] Uploading evidence:", {
      orgId,
      userId,
      subModuleId,
      fileCount: files.length,
    });

    // NOTE: No database-level check for existing evidence count
    // UI-level validation prevents uploading more than 3 files in the modal
    // This allows the system to work correctly with temporary evidence storage

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError(
          `File size exceeds maximum limit (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
          { fileName: file.name, size: file.size },
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new ValidationError("Only DOCX files are allowed", {
          fileName: file.name,
          mimeType: file.type,
        });
      }
    }

    // Upload each file
    const uploadedEvidence = [];

    for (const file of files) {
      try {
        const fileName = file.name;

        // Upload original file to S3
        const fileKey = `uploads/${orgId}/${subModuleId}/${randomUUID()}_${fileName}`;
        await uploadToS3(file, fileKey);

        // Extract text from file
        let extractedText = "";
        try {
          if (file.type.includes("wordprocessingml")) {
            const fileBuffer = await file.arrayBuffer();
            extractedText = await extractTextFromDOCX(Buffer.from(fileBuffer));
          }
        } catch (extractError) {
          console.error("[SERVER ACTION] Error extracting text:", extractError);
          extractedText = "[Text extraction failed]";
        }

        // Upload extracted text to S3
        const textKey = `extracted/${orgId}/${subModuleId}/${randomUUID()}_extracted.txt`;
        const textBlob = new Blob([extractedText], { type: "text/plain" });
        await uploadToS3(textBlob, textKey);

        // Save to database
        const evidenceId = randomUUID();
        await query(
          `INSERT INTO uploaded_evidence (
            id, org_id, sub_module_id, filename, file_key, extracted_text_key, 
            file_size, uploaded_by, uploaded_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            evidenceId,
            orgId,
            subModuleId,
            fileName,
            fileKey,
            textKey,
            file.size,
            userId,
          ],
        );

        uploadedEvidence.push({
          id: evidenceId,
          fileName,
          fileKey,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
        });

        console.log("[SERVER ACTION] File uploaded:", fileName);
      } catch (error) {
        console.error("[SERVER ACTION] Error uploading file:", error);
        throw new ServerError("Failed to upload file", {
          fileName: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return createSuccessResponse({
      uploadedEvidence,
      message: `${uploadedEvidence.length} file(s) uploaded successfully`,
    });
  } catch (error) {
    console.error("[SERVER ACTION] Error in uploadEvidenceAction:", error);
    return createErrorResponse(error);
  }
}

/**
 * Delete evidence by ID
 *
 * @param evidenceId - Evidence ID to delete
 * @returns Success response
 */
export async function deleteEvidenceAction(
  evidenceId: string,
): Promise<ActionResponse> {
  try {
    // Authenticate
    const { orgId } = await getAuthContext();

    if (!evidenceId) {
      throw new ValidationError("Evidence ID is required");
    }

    console.log("[SERVER ACTION] Deleting evidence:", { orgId, evidenceId });

    // Get evidence record
    const result = await query(
      `SELECT id, file_key, extracted_text_key FROM uploaded_evidence 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [evidenceId, orgId],
    );

    if (result.rows.length === 0) {
      throw new ValidationError("Evidence not found");
    }

    const evidence = result.rows[0];

    // Delete from S3
    try {
      if (evidence.file_key) {
        await deleteFromS3(evidence.file_key);
      }
      if (evidence.extracted_text_key) {
        await deleteFromS3(evidence.extracted_text_key);
      }
    } catch (s3Error) {
      console.error("[SERVER ACTION] Error deleting from S3:", s3Error);
      // Continue anyway - still soft delete from DB
    }

    // Soft delete from database
    await query(
      `UPDATE uploaded_evidence SET deleted_at = NOW() WHERE id = $1`,
      [evidenceId],
    );

    console.log("[SERVER ACTION] Evidence deleted:", evidenceId);

    return createSuccessResponse({
      message: "Evidence deleted successfully",
    });
  } catch (error) {
    console.error("[SERVER ACTION] Error in deleteEvidenceAction:", error);
    return createErrorResponse(error);
  }
}

/**
 * Fetch evidence for a submodule
 *
 * @param subModuleId - SubModule ID
 * @returns Array of evidence files
 */
export async function fetchEvidenceAction(
  subModuleId: string,
): Promise<ActionResponse> {
  try {
    // Authenticate
    const { orgId } = await getAuthContext();

    if (!subModuleId) {
      throw new ValidationError("subModuleId is required");
    }

    const result = await query(
      `SELECT id, filename, file_key, file_size, uploaded_at, uploaded_by
       FROM uploaded_evidence
       WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL
       ORDER BY uploaded_at DESC`,
      [orgId, subModuleId],
    );

    const evidence = result.rows.map((row: any) => ({
      id: row.id,
      fileName: row.filename,
      fileKey: row.file_key,
      fileSize: row.file_size,
      uploadedAt: row.uploaded_at,
      uploadedBy: row.uploaded_by,
    }));

    return createSuccessResponse({
      evidence,
      maxAllowed: MAX_FILES,
    });
  } catch (error) {
    console.error("[SERVER ACTION] Error in fetchEvidenceAction:", error);
    return createErrorResponse(error);
  }
}
