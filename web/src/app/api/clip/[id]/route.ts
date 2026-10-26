import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  await prisma.clip.deleteMany({ where: { id: Number(id), userId: user.id } });
  return Response.json({ ok: true });
}
