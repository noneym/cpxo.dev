// cpxo MCP server: lets AI assistants read the clipboard history, push clips,
// list / upload / delete files. Auth = the account's cpx_ token as a Bearer token.
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { prisma } from "./db";
import { config, fileUrl, maxFileLabel } from "./config";
import { cleanName, fileJson, storeStream } from "./upload";
import { deleteObject } from "./storage";
import type { User } from "@prisma/client";

const SOURCE = "ai";
const MCP_UPLOAD_LIMIT = 25 * 1024 * 1024; // inline content through MCP; bigger files go through curl or the apps
const SOURCES = ["ios", "windows", "mac", "cli", "web", "ai"] as const;

async function userFromAuth(auth?: AuthInfo): Promise<User> {
  const id = Number(auth?.extra?.userId);
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (!user) throw new Error("unauthorized");
  return user;
}

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}
function json(v: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }], structuredContent: v as Record<string, unknown> };
}
function fmt(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function registerTools(server: McpServer) {
  server.registerTool(
    "clipboard_latest",
    {
      title: "Latest clipboard entry",
      description: "Returns the most recent clipboard entry synced to cpxo from any device (iPhone, Mac, Windows, shell).",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async (_args, ctx) => {
      const user = await userFromAuth(ctx.http?.authInfo);
      const clip = await prisma.clip.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" } });
      if (!clip) return text("The clipboard history is empty.");
      return json({ id: clip.id, text: clip.text, source: clip.source, createdAt: clip.createdAt });
    }
  );

  server.registerTool(
    "clipboard_history",
    {
      title: "Search clipboard history",
      description:
        "Lists clipboard entries, newest first. Filter by device (source) and/or search text. Use `before` (an id) to page further back.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20).describe("How many entries (1-100)"),
        source: z.enum(SOURCES).optional().describe("Only entries from this device"),
        q: z.string().max(200).optional().describe("Substring to search for"),
        before: z.number().int().optional().describe("Only entries with id lower than this (paging cursor)"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit, source, q, before }, ctx) => {
      const user = await userFromAuth(ctx.http?.authInfo);
      const where = {
        userId: user.id,
        ...(source ? { source } : {}),
        ...(q ? { text: { contains: q } } : {}),
        ...(before ? { id: { lt: before } } : {}),
      };
      const rows = await prisma.clip.findMany({ where, orderBy: { id: "desc" }, take: limit });
      const items = rows.map((c) => ({ id: c.id, text: c.text.length > 4000 ? c.text.slice(0, 4000) + "…" : c.text, source: c.source, createdAt: c.createdAt }));
      return json({ items, nextCursor: items.length === limit ? items[items.length - 1].id : null });
    }
  );

  server.registerTool(
    "clipboard_push",
    {
      title: "Send text to the clipboard",
      description: "Pushes text to the user's cpxo clipboard. It lands on the Mac/Windows clipboard within seconds and on the iPhone with the Get shortcut.",
      inputSchema: z.object({ text: z.string().min(1).max(config.maxClipBytes).describe("The text to put on the clipboard") }),
    },
    async ({ text: t }, ctx) => {
      const user = await userFromAuth(ctx.http?.authInfo);
      const latest = await prisma.clip.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" } });
      const clip = latest && latest.text === t ? latest : await prisma.clip.create({ data: { userId: user.id, text: t, source: SOURCE } });
      return json({ id: clip.id, createdAt: clip.createdAt, duplicate: latest?.id === clip.id });
    }
  );

  server.registerTool(
    "files_list",
    {
      title: "List shared files",
      description: `Lists the user's uploaded files (not expired) with share links. Files are deleted ${config.fileTtlDays} days after upload.`,
      inputSchema: z.object({ limit: z.number().int().min(1).max(200).default(50) }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit }, ctx) => {
      const user = await userFromAuth(ctx.http?.authInfo);
      const files = await prisma.file.findMany({
        where: { userId: user.id, status: "ready", expiresAt: { gt: new Date() } },
        orderBy: { id: "desc" },
        take: limit,
      });
      return json({ files: files.map((f) => ({ ...fileJson(f), sizeLabel: fmt(Number(f.size)) })) });
    }
  );

  server.registerTool(
    "file_upload",
    {
      title: "Upload a file and get a share link",
      description:
        `Uploads a file to cpxo and returns a public share link (valid ${config.fileTtlDays} days). Pass the content as text, or base64 for binary. ` +
        `Inline uploads are limited to ${fmt(MCP_UPLOAD_LIMIT)}; for bigger files use curl -T or the desktop app (up to ${maxFileLabel}). ` +
        "Set push_link=true to also put the link on the user's clipboard.",
      inputSchema: z.object({
        name: z.string().min(1).max(200).describe("File name, e.g. notes.md or report.pdf"),
        content: z.string().min(1).describe("File content: plain text, or base64 when encoding is 'base64'"),
        encoding: z.enum(["text", "base64"]).default("text"),
        mime: z.string().max(128).optional().describe("Content type, guessed from the name when omitted"),
        push_link: z.boolean().default(false),
      }),
    },
    async ({ name, content, encoding, mime, push_link }, ctx) => {
      const user = await userFromAuth(ctx.http?.authInfo);
      const buf = encoding === "base64" ? Buffer.from(content, "base64") : Buffer.from(content, "utf8");
      if (buf.length > MCP_UPLOAD_LIMIT) return text(`Too large for an inline upload (${fmt(buf.length)} > ${fmt(MCP_UPLOAD_LIMIT)}). Use curl -T or the desktop app.`);
      const safe = cleanName(name);
      const type = mime || guessMime(safe);
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new Uint8Array(buf));
          c.close();
        },
      });
      const file = await storeStream(user, safe, type, stream, buf.length);
      if (push_link) await prisma.clip.create({ data: { userId: user.id, text: file.url, source: SOURCE } });
      return json({ ...file, sizeLabel: fmt(file.size) });
    }
  );

  server.registerTool(
    "file_delete",
    {
      title: "Delete a shared file",
      description: "Deletes one of the user's files now (by id or share code). The link stops working immediately.",
      inputSchema: z.object({ id: z.number().int().optional(), code: z.string().optional() }),
      annotations: { destructiveHint: true },
    },
    async ({ id, code }, ctx) => {
      const user = await userFromAuth(ctx.http?.authInfo);
      const file = await prisma.file.findFirst({ where: { userId: user.id, ...(id ? { id } : {}), ...(code ? { code } : {}) } });
      if (!file) return text("No such file.");
      await deleteObject(file.objectKey);
      await prisma.file.delete({ where: { id: file.id } });
      return json({ ok: true, deleted: fileUrl(file.code, file.name) });
    }
  );
}

function guessMime(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    txt: "text/plain", md: "text/markdown", json: "application/json", csv: "text/csv", html: "text/html", js: "text/javascript", ts: "text/plain",
    py: "text/x-python", pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
    zip: "application/zip", mp4: "video/mp4", mov: "video/quicktime", mp3: "audio/mpeg",
  };
  return map[ext] ?? "application/octet-stream";
}

const base = createMcpHandler(registerTools, {
  serverInfo: { name: "cpxo", version: "1.0.0" },
  instructions:
    "cpxo is the user's universal clipboard and file drop. Use clipboard_latest / clipboard_history to see what they copied on their phone or computers, clipboard_push to hand them text, and file_upload to give them a share link for a file.",
});

/** Verifies the cpx_ API token and exposes the user id to tools through authInfo.extra. */
async function verifyToken(_req: Request, bearer?: string): Promise<AuthInfo | undefined> {
  if (!bearer || !bearer.startsWith("cpx_")) return undefined;
  const t = await prisma.apiToken.findUnique({ where: { token: bearer }, include: { user: true } });
  if (!t) return undefined;
  prisma.apiToken.update({ where: { id: t.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { token: bearer, clientId: `token-${t.id}`, scopes: ["cpxo"], extra: { userId: t.userId, email: t.user.email } };
}

export const mcpHandler = withMcpAuth(base, verifyToken, { required: true });
