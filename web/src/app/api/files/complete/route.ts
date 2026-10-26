import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config, maxFileLabel } from "@/lib/config";
import { objectSize, deleteObject } from "@/lib/storage";
import { fileJson, uploadResponse } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const file = await prisma.file.findFirst({ where: { code: body.code ?? "", userId: user.id } });
  if (!file) return Response.json({ error: "not found" }, { status: 404 });
  let size = 0;
  try {
    size = (await objectSize(file.objectKey)).size;
  } catch {
    return Response.json({ error: "object not uploaded yet" }, { status: 409 });
  }
  if (size > config.maxFileBytes) {
    await deleteObject(file.objectKey);
    await prisma.file.delete({ where: { id: file.id } });
    return Response.json({ error: `file too large (max ${maxFileLabel})` }, { status: 413 });
  }
  const updated = await prisma.file.update({ where: { id: file.id }, data: { status: "ready", size: BigInt(size) } });
  return uploadResponse(req, fileJson(updated), 200);
}
