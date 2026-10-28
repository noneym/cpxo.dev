// POST /api/drop: one endpoint for the iOS Shortcut. Text bodies become a
// clipboard entry; anything else (photo, video, PDF, any file) is uploaded,
// and the share link is stored as a clipboard entry so every device gets it.
// Responds with text/plain: the text itself, or the file URL.
import { apiUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { cleanName, storeStream } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/tiff": "tiff",
  "video/quicktime": "mov",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "application/pdf": "pdf",
  "application/zip": "zip",
};

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function plain(text: string, status = 200) {
  return new Response(text + "\n", { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  const mime = ct.split(";")[0].trim();
  const source = req.headers.get("x-source") ?? "ios";
  const src = ["ios", "windows", "mac", "cli", "web", "ai"].includes(source) ? source : "ios";

  // Text: same as POST /api/clip
  const isText = !mime || mime.startsWith("text/") || mime === "application/json" || mime === "application/x-www-form-urlencoded";
  if (isText) {
    let text = "";
    if (mime === "application/json") {
      const body = (await req.json().catch(() => ({}))) as { text?: unknown };
      text = typeof body.text === "string" ? body.text : "";
    } else if (mime === "application/x-www-form-urlencoded") {
      text = String((await req.formData()).get("text") ?? "");
    } else {
      text = await req.text();
    }
    if (!text.trim()) return plain("empty clipboard", 400);
    if (Buffer.byteLength(text) > config.maxClipBytes) return plain("clip too large", 413);
    await saveTextClip(user.id, text, src);
    return plain(text);
  }

  // Multipart from a form: take the file field
  if (mime === "multipart/form-data") {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) return plain("multipart field 'file' missing", 400);
    const file = await storeStream(user, cleanName(f.name), f.type, f.stream(), f.size);
    await prisma.clip.create({ data: { userId: user.id, text: file.url, source: src } });
    return plain(file.url, 201);
  }

  // Binary: photo, video, document, anything
  if (!req.body) return plain("empty body", 400);
  let body: ReadableStream<Uint8Array> = req.body;
  let effMime = mime;
  if (mime === "application/octet-stream") {
    // Some clients send text without a type. Sniff: small, valid UTF-8, no NUL bytes -> clip.
    const sniffed = await sniffText(req.body, config.maxClipBytes);
    const magic = sniffMime(sniffed.head);
    if (sniffed.text !== null && !magic) {
      if (!sniffed.text.trim()) return plain("empty clipboard", 400);
      await saveTextClip(user.id, sniffed.text, src);
      return plain(sniffed.text);
    }
    body = sniffed.stream;
    effMime = magic ?? "application/octet-stream";
  }
  const ext = EXT[effMime] ?? (effMime === "application/octet-stream" ? "bin" : effMime.split("/")[1].replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin");
  const kind = effMime.startsWith("image/") ? "photo" : effMime.startsWith("video/") ? "video" : "file";
  const name = cleanName(req.headers.get("x-file-name") || url.searchParams.get("name") || `${kind}-${stamp()}.${ext || "bin"}`);
  const declared = Number(req.headers.get("content-length") ?? 0) || undefined;
  try {
    const file = await storeStream(user, name, effMime, body, declared);
    await prisma.clip.create({ data: { userId: user.id, text: file.url, source: src } });
    return plain(file.url, 201);
  } catch (e) {
    const err = e as Error & { status?: number };
    return plain(err.message, err.status ?? 500);
  }
}

/** Stores a text clip unless it equals the latest one (periodic automations resend the clipboard). */
async function saveTextClip(userId: number, text: string, source: string) {
  const latest = await prisma.clip.findFirst({ where: { userId }, orderBy: { id: "desc" }, select: { text: true } });
  if (latest && latest.text === text) return;
  await prisma.clip.create({ data: { userId, text, source } });
}

/** Reads up to `limit` bytes; returns the text when the whole body is small valid UTF-8, else a stream replaying everything. */
async function sniffText(src: ReadableStream<Uint8Array>, limit: number): Promise<{ text: string | null; stream: ReadableStream<Uint8Array>; head: Uint8Array }> {
  const reader = src.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let done = false;
  while (size <= limit) {
    const r = await reader.read();
    if (r.done) {
      done = true;
      break;
    }
    chunks.push(r.value);
    size += r.value.length;
  }
  const replay = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (chunks.length) return controller.enqueue(chunks.shift()!);
      if (done) return controller.close();
      const r = await reader.read();
      if (r.done) {
        done = true;
        controller.close();
      } else controller.enqueue(r.value);
    },
  });
  const head = chunks[0]?.slice(0, 16) ?? new Uint8Array();
  if (!done || size > limit) return { text: null, stream: replay, head };
  const buf = Buffer.concat(chunks);
  if (buf.includes(0)) return { text: null, stream: replay, head };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buf), stream: replay, head };
  } catch {
    return { text: null, stream: replay, head };
  }
}

/** Magic-number detection for the common things a phone clipboard holds. */
function sniffMime(h: Uint8Array): string | null {
  const hex = Buffer.from(h).toString("hex");
  const ascii = Buffer.from(h).toString("latin1");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e47")) return "image/png";
  if (ascii.startsWith("GIF8")) return "image/gif";
  if (ascii.startsWith("%PDF")) return "application/pdf";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  if (hex.startsWith("504b0304")) return "application/zip";
  if (ascii.slice(4, 8) === "ftyp") {
    const brand = ascii.slice(8, 12);
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand.startsWith("mif1")) return "image/heic";
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }
  return null;
}
