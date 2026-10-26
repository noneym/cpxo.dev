import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? 20) || 20));
  const clips = await prisma.clip.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
    take: limit,
  });
  return Response.json(
    clips.map((c) => ({
      id: c.id,
      text: c.text.length > 2000 ? c.text.slice(0, 2000) : c.text,
      source: c.source,
      createdAt: c.createdAt,
    }))
  );
}
