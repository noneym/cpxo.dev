import {
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  issueEmailToken,
  consumeEmailToken,
  needsVerification,
  newApiToken,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";
import { mailEnabled, sendResetMail, sendVerificationMail } from "@/lib/mail";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 3600_000;

type Body = { mode?: string; email?: string; password?: string; captcha?: string; token?: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  switch (body.mode) {
    case "logout":
      await destroySession();
      return Response.json({ ok: true });

    case "resend": {
      const user = await currentUser();
      if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
      if (user.emailVerifiedAt) return Response.json({ ok: true, verified: true });
      const t = await issueEmailToken(user.id, "verify", 24 * HOUR);
      await sendVerificationMail(user.email, t);
      return Response.json({ ok: true });
    }

    case "forgot": {
      if (!EMAIL.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && mailEnabled) {
        const t = await issueEmailToken(user.id, "reset", HOUR);
        await sendResetMail(user.email, t);
      }
      // Same answer whether or not the account exists.
      return Response.json({ ok: true });
    }

    case "reset": {
      if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      const user = await consumeEmailToken(body.token ?? "", "reset");
      if (!user) return Response.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
      });
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await createSession(user.id);
      return Response.json({ ok: true });
    }
  }

  if (!EMAIL.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  if (body.mode === "register") {
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    if (!(await verifyTurnstile(body.captcha, ip))) {
      return Response.json({ error: "Captcha check failed. Please try again." }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return Response.json({ error: "That email already has an account. Sign in instead." }, { status: 409 });
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        emailVerifiedAt: mailEnabled ? null : new Date(),
        tokens: { create: { name: "default", token: newApiToken() } },
      },
    });
    if (mailEnabled) {
      const t = await issueEmailToken(user.id, "verify", 24 * HOUR);
      await sendVerificationMail(user.email, t);
    }
    await createSession(user.id);
    return Response.json({ ok: true, verify: mailEnabled }, { status: 201 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "Email or password is wrong." }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({ ok: true, verify: needsVerification(user) });
}
