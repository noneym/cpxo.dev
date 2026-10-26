import { currentUser, newApiToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const tokens = await prisma.apiToken.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } });
  return Response.json(tokens.map((t) => ({ id: t.id, name: t.name, token: t.token, lastUsedAt: t.lastUsedAt, createdAt: t.createdAt })));
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "token").toString().slice(0, 64) || "token";
  const t = await prisma.apiToken.create({ data: { userId: user.id, name, token: newApiToken() } });
  return Response.json({ id: t.id, name: t.name, token: t.token, createdAt: t.createdAt }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  await prisma.apiToken.deleteMany({ where: { id, userId: user.id } });
  return Response.json({ ok: true });
}
