import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { upsertDocument } from "@/lib/primus/db-helper";
import { loadSubmoduleSpec } from "@/server/primus/loader";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for upload and processing

const s3 = new S3Client({ region: process.env.AWS_REGION! });

/**
 * POST /api/compliance/upload
 * Upload a compliance document (DOCX only)
 *
 * Request: multipart/form-data
 * - file: File (DOCX document)
 * - moduleNumber: string (e.g., "1", "5")
 * - subModuleCode: string (e.g., "1.01", "5.12", "4.04.01")
 *
 * Returns:
 * - success: boolean
 * - documentId: string
 * - contentKey: string (S3 key for document)
 * - fileName: string
 * - metadata: object
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and get user context
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const moduleNumber = formData.get("moduleNumber") as string;
    const subModuleCode = formData.get("subModuleCode") as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 },
      );
    }

    if (!moduleNumber || !subModuleCode) {
      return NextResponse.json(
        { error: "moduleNumber and subModuleCode are required" },
        { status: 400 },
      );
    }

    // Validate file type - only DOCX allowed
    const validMimeType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (file.type !== validMimeType) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          details: "Only DOCX files are allowed",
        },
        { status: 400 },
      );
    }

    // Validate file extension
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        {
          error: "Invalid file extension",
          details: "File must have .docx extension",
        },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          error: "File too large",
          details: "Maximum file size is 10MB",
        },
        { status: 400 },
      );
    }

    console.log("[API] Uploading document:", {
      orgId,
      userId,
      moduleNumber,
      subModuleCode,
      fileName: file.name,
      fileSize: file.size,
    });

    // Load submodule specification to get title
    const submoduleSpec = loadSubmoduleSpec(moduleNumber, subModuleCode);

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3 with proper naming convention
    const timestamp = Date.now();
    const sanitizedTitle = submoduleSpec.title.replace(
      /[^a-zA-Z0-9.-]/g,
      "_",
    );
    const uploadFileName = `${subModuleCode}_${sanitizedTitle}_v1.docx`;

    // S3 key following pattern: primus_gfs/{moduleNumber}/{subModuleCode}/v{version}_{timestamp}.docx
    const s3Key = `primus_gfs/${moduleNumber}/${subModuleCode}/v1_${timestamp}.docx`;

    console.log(`[API] Uploading to S3: ${s3Key}`);

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key,
        Body: fileBuffer,
        ContentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Metadata: {
          moduleNumber,
          subModuleCode,
          subModuleTitle: submoduleSpec.title,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      }),
    );

    console.log("[API] ✅ Document uploaded to S3 successfully!");

    // Insert document record into database
    console.log("[API] Inserting document record into database...");

    // Parse sub-module code to check if it's a sub-sub-module (e.g., "4.04.01")
    const codeParts = subModuleCode.split(".");
    const isSubSubModule = codeParts.length === 3;
    const actualSubModuleId = isSubSubModule
      ? `${codeParts[0]}.${codeParts[1]}`
      : subModuleCode;
    const subSubModuleId = isSubSubModule ? subModuleCode : null;

    const documentId = await upsertDocument({
      org_id: orgId,
      framework_id: "primus_gfs",
      module_id: moduleNumber,
      sub_module_id: actualSubModuleId,
      sub_sub_module_id: subSubModuleId,
      title: submoduleSpec.title,
      status: "draft",
      content_key: s3Key,
      current_version: 1,
      created_by: userId,
      updated_by: null,
    });

    console.log(`[API] Document record created with ID: ${documentId}`);

    return NextResponse.json(
      {
        success: true,
        documentId,
        contentKey: s3Key,
        fileName: uploadFileName,
        message: "Document uploaded successfully",
        metadata: {
          moduleNumber,
          subModuleCode,
          subModuleTitle: submoduleSpec.title,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error uploading document:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          error: "Specification not available",
          details: error.message,
          hint: "This module or submodule specification has not been created yet.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
