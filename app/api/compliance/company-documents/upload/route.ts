/**
 * POST /api/compliance/company-documents/upload
 * Upload a standalone company document (not tied to any module)
 *
 * Form data:
 * - file: File (DOCX document)
 * - title: string (document title)
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

    if (!file || !title) {
      return NextResponse.json(
        { error: "File and title are required" },
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

    // Generate S3 key
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

    console.log(`[API] Uploaded company document to S3: ${s3Key}`);

    // Store document metadata in database
    const result = await query(
      `INSERT INTO document (
        id, org_id, framework_id, module_id, sub_module_id, 
        title, status, content_key, current_version, 
        created_by, updated_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        documentId,
        orgId,
        "company_docs", // Special framework ID for company documents
        "company", // Special module ID for company documents
        "company", // Special sub-module ID for company documents
        title,
        "published", // Company uploaded docs are published by default
        s3Key,
        1, // Version 1
        userId,
        userId,
      ],
    );

    const document = result.rows[0];

    console.log(`[API] Created company document record: ${documentId}`);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        contentKey: document.content_key,
        version: document.current_version,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] Error uploading company document:", error);
    return NextResponse.json(
      {
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
