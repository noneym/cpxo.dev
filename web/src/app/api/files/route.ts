import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fileJson } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const files = await prisma.file.findMany({
    where: { userId: user.id, status: "ready", expiresAt: { gt: new Date() } },
    orderBy: { id: "desc" },
    take: 200,
  });
  return Response.json(files.map(fileJson));
}
