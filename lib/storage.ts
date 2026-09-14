import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function s3Configured() {
  return Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET);
}

function s3() {
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export function buildFileKey(prefix: string, originalName: string) {
  const ext = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() : "bin";
  return `${prefix}/${randomUUID()}.${ext}`;
}

export async function putFile(key: string, body: Buffer, contentType: string) {
  if (s3Configured()) {
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return;
  }

  const full = path.join(UPLOAD_ROOT, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  if (s3Configured()) {
    const result = await s3().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty object");
    return Buffer.from(bytes);
  }
  return readFile(path.join(UPLOAD_ROOT, key));
}

export async function getFileUrl(key: string) {
  if (s3Configured()) {
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }), {
      expiresIn: 900,
    });
  }
  return `/api/files/${key}`;
}

export async function deleteFile(key: string) {
  if (s3Configured()) {
    await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return;
  }
  await unlink(path.join(UPLOAD_ROOT, key)).catch(() => undefined);
}
