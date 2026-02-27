import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as mammoth from "mammoth";

const s3Client = new S3Client({ region: process.env.AWS_REGION! });

/**
 * Upload file to S3
 * @param file - File or Blob to upload
 * @param path - S3 path (will be prefixed with bucket)
 * @returns S3 key used for storage
 */
export async function uploadToS3(
  file: File | Blob,
  path: string,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const s3Key = path;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  return s3Key;
}

/**
 * Download file from S3
 * @param s3Key - S3 key to download
 * @returns Buffer or string content
 */
export async function getFromS3(s3Key: string): Promise<Buffer | string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const body = await response.Body?.transformToByteArray();

  if (!body) {
    throw new Error(`Failed to retrieve file from S3: ${s3Key}`);
  }

  return Buffer.from(body);
}

/**
 * Extract text from DOCX file
 * @param buffer - Buffer containing DOCX file
 * @returns Extracted text
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Delete file from S3
 * @param s3Key - S3 key to delete
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key,
    }),
  );
}

/**
 * Generate presigned URL for download
 * @param s3Key - S3 key
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL
 */
export async function getPresignedUrl(
  s3Key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: s3Key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}
