import { apiUser, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  return Response.json({ email: user.email });
}
