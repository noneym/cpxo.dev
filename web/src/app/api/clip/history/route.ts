import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const SOURCES = new Set(["ios", "windows", "mac", "cli", "web", "unknown"]);

/**
 * GET /api/clip/history
 *   limit   1..100 (default 30)
 *   source  ios | windows | mac | cli | web   (comma-separated allowed)
 *   q       substring search in the text
 *   before  cursor: only entries with id < before
 *   after   only entries with id > after (used to pick up new clips)
 * Returns { items, nextCursor, total }.
 */
export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const p = new URL(req.url).searchParams;
  const limit = Math.min(100, Math.max(1, Number(p.get("limit") ?? 30) || 30));
  const sources = (p.get("source") ?? "").split(",").map((s) => s.trim()).filter((s) => SOURCES.has(s));
  const q = (p.get("q") ?? "").trim().slice(0, 200);
  const before = Number(p.get("before") ?? 0) || 0;
  const after = Number(p.get("after") ?? 0) || 0;

  const where: Prisma.ClipWhereInput = { userId: user.id };
  if (sources.length) where.source = { in: sources };
  if (q) where.text = { contains: q };
  if (before) where.id = { lt: before };
  if (after) where.id = { ...(where.id as object), gt: after };

  const [items, total] = await Promise.all([
    prisma.clip.findMany({ where, orderBy: { id: "desc" }, take: limit + 1 }),
    prisma.clip.count({ where: { userId: user.id, ...(sources.length ? { source: { in: sources } } : {}), ...(q ? { text: { contains: q } } : {}) } }),
  ]);
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return Response.json({
    items: page.map((c) => ({
      id: c.id,
      text: c.text.length > 2000 ? c.text.slice(0, 2000) : c.text,
      source: c.source,
      createdAt: c.createdAt,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
  });
}

/** DELETE /api/clip/history: clears the history (respects the same source/q filters). */
export async function DELETE(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const p = new URL(req.url).searchParams;
  const sources = (p.get("source") ?? "").split(",").map((s) => s.trim()).filter((s) => SOURCES.has(s));
  const q = (p.get("q") ?? "").trim().slice(0, 200);
  const where: Prisma.ClipWhereInput = { userId: user.id };
  if (sources.length) where.source = { in: sources };
  if (q) where.text = { contains: q };
  const r = await prisma.clip.deleteMany({ where });
  return Response.json({ ok: true, deleted: r.count });
}
