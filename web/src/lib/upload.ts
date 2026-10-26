import { prisma } from "./db";
import { config, fileUrl, maxFileLabel } from "./config";
import { shortCode } from "./auth";
import { streamToObject, objectSize } from "./storage";
import type { User } from "@prisma/client";

export function expiresAt() {
  return new Date(Date.now() + config.fileTtlDays * 86400_000);
}

export function cleanName(name: string | null | undefined) {
  const base = (name ?? "").split(/[\\/]/).pop()?.trim() ?? "";
  const safe = base.replace(/[\u0000-\u001f]/g, "").slice(0, 200);
  return safe || "upload.bin";
}

export function objectKeyFor(code: string, name: string) {
  return `${code}/${name}`;
}

export function fileJson(f: {
  id: number; code: string; name: string; size: bigint; mime: string; downloads: number; createdAt: Date; expiresAt: Date;
}) {
  return {
    id: f.id,
    code: f.code,
    name: f.name,
    size: Number(f.size),
    mime: f.mime,
    url: fileUrl(f.code, f.name),
    downloads: f.downloads,
    createdAt: f.createdAt,
    expiresAt: f.expiresAt,
  };
}

/** Streams a request body (or any stream) into MinIO and records the file. */
export async function storeStream(
  user: User,
  name: string,
  mime: string,
  body: ReadableStream<Uint8Array>,
  declaredSize?: number
) {
  if (declaredSize && declaredSize > config.maxFileBytes) {
    throw Object.assign(new Error(`file too large (max ${maxFileLabel})`), { status: 413 });
  }
  const code = shortCode();
  const key = objectKeyFor(code, name);
  await streamToObject(key, body, mime || "application/octet-stream");
  const { size } = await objectSize(key);
  if (size > config.maxFileBytes) {
    const { deleteObject } = await import("./storage");
    await deleteObject(key);
    throw Object.assign(new Error(`file too large (max ${maxFileLabel})`), { status: 413 });
  }
  const file = await prisma.file.create({
    data: {
      userId: user.id,
      code,
      name,
      size: BigInt(size),
      mime: mime || "application/octet-stream",
      objectKey: key,
      expiresAt: expiresAt(),
    },
  });
  return fileJson(file);
}

export function uploadResponse(req: Request, file: ReturnType<typeof fileJson>, status = 201) {
  const url = new URL(req.url);
  const wantsPlain =
    url.searchParams.get("plain") === "1" ||
    (req.headers.get("accept") ?? "").startsWith("text/plain");
  if (wantsPlain) {
    return new Response(file.url + "\n", { status, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return Response.json(file, { status });
}
