import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const s3 = new S3Client({ region: process.env.AWS_REGION! });

/**
 * GET /api/compliance/download
 * Download a generated compliance document from S3
 *
 * Query params:
 * - key: string (S3 key of the document)
 *
 * Returns: Document file as blob
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing 'key' parameter" },
        { status: 400 },
      );
    }

    console.log(`[API] Downloading document from S3: ${key}`);

    // Fetch the document from S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("No content in S3 response");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - Body is a readable stream
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log(`[API] ✅ Document downloaded successfully (${buffer.length} bytes)`);

    // Extract filename from key (last part of the path)
    const filename = key.split('/').pop() || 'document.docx';

    // Return the file as a downloadable response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.ContentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[API] Error downloading document:", error);

    return NextResponse.json(
      {
        error: "Failed to download document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
