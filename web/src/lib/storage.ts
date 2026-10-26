import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketLifecycleConfigurationCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { config } from "./config";

const { minio } = config;

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: `${minio.secure ? "https" : "http"}://${minio.endpoint}`,
  forcePathStyle: true,
  credentials: { accessKeyId: minio.accessKey, secretAccessKey: minio.secretKey },
});

const Bucket = minio.bucket;

let ensured: Promise<void> | null = null;
/** Creates the bucket (if missing) and applies the expiry lifecycle rule. Runs once per process. */
export function ensureBucket() {
  if (!ensured) {
    ensured = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket }));
      } catch {
        await s3.send(new CreateBucketCommand({ Bucket }));
      }
      try {
        await s3.send(
          new PutBucketLifecycleConfigurationCommand({
            Bucket,
            LifecycleConfiguration: {
              Rules: [
                {
                  ID: "expire-uploads",
                  Status: "Enabled",
                  Filter: { Prefix: "" },
                  Expiration: { Days: config.fileTtlDays + 1 },
                  AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
                },
              ],
            },
          })
        );
      } catch (e) {
        console.warn("lifecycle rule not applied:", (e as Error).message);
      }
    })().catch((e) => {
      ensured = null;
      throw e;
    });
  }
  return ensured;
}

export async function streamToObject(
  key: string,
  body: ReadableStream<Uint8Array> | Readable,
  contentType: string
) {
  await ensureBucket();
  const nodeBody = body instanceof Readable ? body : Readable.fromWeb(body as never);
  const upload = new Upload({
    client: s3,
    params: { Bucket, Key: key, Body: nodeBody, ContentType: contentType },
    queueSize: 4,
    partSize: 16 * 1024 * 1024,
    leavePartsOnError: false,
  });
  await upload.done();
}

export async function objectSize(key: string) {
  const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
  return { size: Number(head.ContentLength ?? 0), mime: head.ContentType ?? "application/octet-stream" };
}

export async function presignedPut(key: string, contentType: string, expiresIn = 3600 * 6) {
  await ensureBucket();
  return getSignedUrl(s3, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), { expiresIn });
}

export async function presignedGet(key: string, filename: string, expiresIn = 600) {
  const safe = filename.replace(/["\\\r\n]/g, "_");
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn }
  );
}

export async function deleteObject(key: string) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
  } catch (e) {
    console.warn("delete failed", key, (e as Error).message);
  }
}
