import { apiUser, unauthorized } from "@/lib/auth";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return withCors(unauthorized());
  return withCors(Response.json({ email: user.email }));
}
