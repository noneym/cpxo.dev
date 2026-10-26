import { prisma } from "@/lib/db";
import { presignedGet } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const file = await prisma.file.findUnique({ where: { code } });
  if (!file || file.status !== "ready" || file.expiresAt < new Date()) {
    return Response.json({ error: "file not found or expired" }, { status: 404 });
  }
  prisma.file.update({ where: { id: file.id }, data: { downloads: { increment: 1 } } }).catch(() => {});
  const url = await presignedGet(file.objectKey, file.name);
  return Response.redirect(url, 302);
}
