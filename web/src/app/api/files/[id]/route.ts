import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const file = await prisma.file.findFirst({ where: { id: Number(id), userId: user.id } });
  if (!file) return Response.json({ error: "not found" }, { status: 404 });
  await deleteObject(file.objectKey);
  await prisma.file.delete({ where: { id: file.id } });
  return Response.json({ ok: true });
}
