import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export const runtime = "nodejs";

const SOURCES = new Set(["ios", "windows", "mac", "cli", "web", "ai", "unknown"]);

export async function POST(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();

  const ct = req.headers.get("content-type") ?? "";
  let text = "";
  let source = req.headers.get("x-source") ?? "unknown";

  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { text?: unknown; source?: unknown };
    text = typeof body.text === "string" ? body.text : "";
    if (typeof body.source === "string") source = body.source;
  } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const form = await req.formData();
    text = String(form.get("text") ?? "");
    source = String(form.get("source") ?? source);
  } else {
    text = await req.text();
  }

  if (!SOURCES.has(source)) source = "unknown";
  if (!text.trim()) return Response.json({ error: "empty text" }, { status: 400 });
  if (Buffer.byteLength(text) > config.maxClipBytes)
    return Response.json({ error: "clip too large (max 512 KB)" }, { status: 413 });

  // Same text as the latest entry: do not duplicate (periodic phone automations resend the clipboard).
  const latest = await prisma.clip.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" } });
  if (latest && latest.text === text) {
    return Response.json({ id: latest.id, createdAt: latest.createdAt, source: latest.source, duplicate: true }, { status: 200 });
  }
  const clip = await prisma.clip.create({ data: { userId: user.id, text, source } });
  // trim history to MAX_CLIPS entries (bounded delete per request)
  const old = await prisma.clip.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
    skip: config.maxClips,
    take: 500,
    select: { id: true },
  });
  if (old.length) await prisma.clip.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });

  return Response.json({ id: clip.id, createdAt: clip.createdAt, source: clip.source }, { status: 201 });
}

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const since = Number(url.searchParams.get("since") ?? 0) || 0;
  const clip = await prisma.clip.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" } });
  if (!clip || clip.id <= since) return new Response(null, { status: 204 });

  if (url.searchParams.get("format") === "json") {
    return Response.json({ id: clip.id, text: clip.text, source: clip.source, createdAt: clip.createdAt });
  }
  return new Response(clip.text, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-clip-id": String(clip.id),
      "x-clip-source": clip.source,
      "x-clip-at": clip.createdAt.toISOString(),
      "cache-control": "no-store",
    },
  });
}
