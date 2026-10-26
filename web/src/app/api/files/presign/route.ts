import { apiUser, unauthorized, shortCode } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config, fileUrl } from "@/lib/config";
import { presignedPut } from "@/lib/storage";
import { cleanName, expiresAt, objectKeyFor } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { name?: string; size?: number; mime?: string };
  const size = Number(body.size ?? 0);
  if (size > config.maxFileBytes) return Response.json({ error: "file too large (max 4 GB)" }, { status: 413 });
  const name = cleanName(body.name);
  const mime = body.mime || "application/octet-stream";
  const code = shortCode();
  const key = objectKeyFor(code, name);
  const file = await prisma.file.create({
    data: { userId: user.id, code, name, size: BigInt(size), mime, objectKey: key, status: "pending", expiresAt: expiresAt() },
  });
  const uploadUrl = await presignedPut(key, mime);
  return Response.json({ code, uploadUrl, url: fileUrl(code, name), expiresAt: file.expiresAt, contentType: mime });
}
