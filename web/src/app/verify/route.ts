import { consumeEmailToken, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /verify?token=... : confirms the email, signs the user in, lands on the dashboard. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const user = await consumeEmailToken(token, "verify");
  if (!user) return Response.redirect(`${config.appUrl}/login?verify=invalid`, 302);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
  await createSession(user.id);
  return Response.redirect(`${config.appUrl}/dashboard?verified=1`, 302);
}
