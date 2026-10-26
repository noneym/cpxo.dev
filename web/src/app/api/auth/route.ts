import { createSession, destroySession, hashPassword, newApiToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { mode?: string; email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (body.mode === "logout") {
    await destroySession();
    return Response.json({ ok: true });
  }
  if (!EMAIL.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  if (body.mode === "register") {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return Response.json({ error: "That email already has an account. Sign in instead." }, { status: 409 });
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        tokens: { create: { name: "default", token: newApiToken() } },
      },
    });
    await createSession(user.id);
    return Response.json({ ok: true }, { status: 201 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "Email or password is wrong." }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({ ok: true });
}
