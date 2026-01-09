/**
 * POST /api/compliance/company-documents/upload
 * Upload a document and associate it with a specific module and sub-module
 *
 * Form data:
 * - file: File (DOCX document)
 * - title: string (document title)
 * - moduleId: string (module ID, e.g., "1", "2", "4")
 * - subModuleId: string (sub-module ID, e.g., "1.01", "2.02")
 *
 * Returns: Document metadata
 */

import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getAuthContext } from "@/lib/primus/auth-helper";

const s3 = new S3Client({ region: process.env.AWS_REGION! });

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const moduleId = formData.get("moduleId") as string;
    const subModuleId = formData.get("subModuleId") as string;
    const renewal = formData.get("renewal") as string | null;
    const docType = formData.get("docType") as string | null;

    if (!file || !title || !moduleId || !subModuleId) {
      return NextResponse.json(
        { error: "File, title, moduleId, and subModuleId are required" },
        { status: 400 },
      );
    }

    // Validate file type
    if (
      file.type !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return NextResponse.json(
        { error: "Only DOCX files are allowed" },
        { status: 400 },
      );
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // Generate S3 docs/${orgId}/primus_gfs/uploaded/${subModule
    const documentId = randomUUID();
    const s3Key = `company-documents/${orgId}/${documentId}/${file.name}`;

    // Upload to S3
    const buffer = await file.arrayBuffer();
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key,
      Body: Buffer.from(buffer),
      ContentType: file.type,
    });

    await s3.send(uploadCommand);

    console.log(`[API] Uploaded document to S3: ${s3Key}`);

    // Store document metadata in database
    const result = await query(
      `INSERT INTO document (
        id, org_id, framework_id, module_id, sub_module_id, 
        title, status, content_key, current_version, renewal, doc_type,
        created_by, updated_by, created_at, updated_at, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        documentId,
        orgId,
        "primus_gfs", // Framework ID
        moduleId, // Module ID from form
        subModuleId, // Sub-module ID from form
        title,
        "published", // Uploaded docs are published by default
        s3Key,
        1, // Version 1
        renewal || null,
        docType || null,
        userId,
        userId,
      ],
    );

    const document = result.rows[0];

    console.log(`[API] Created document record: ${documentId} for module ${moduleId}.${subModuleId}`);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        contentKey: document.content_key,
        version: document.current_version,
        publishedAt: document.published_at,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] Error uploading document:", error);
    return NextResponse.json(
      {
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
