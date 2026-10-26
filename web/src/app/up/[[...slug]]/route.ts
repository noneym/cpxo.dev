import { apiUser, unauthorized } from "@/lib/auth";
import { cleanName, storeStream, uploadResponse } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

type Ctx = { params: Promise<{ slug?: string[] }> };

function parseSlug(slug: string[] = []) {
  // /up            -> token from header/query
  // /up/<token>    -> token in path
  // /up/<token>/<name>
  const [first, ...rest] = slug;
  if (first?.startsWith("cpx_")) return { token: first, name: rest.join("/") || undefined };
  return { token: undefined, name: slug.join("/") || undefined };
}

async function handle(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const { token, name: pathName } = parseSlug(slug);
  const user = await apiUser(req, token);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const ct = req.headers.get("content-type") ?? "";

  try {
    if (req.method === "POST" && ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file") ?? form.get("f") ?? form.get("upload");
      if (!(f instanceof File)) return Response.json({ error: "multipart field 'file' missing" }, { status: 400 });
      const name = cleanName(url.searchParams.get("name") || f.name);
      const file = await storeStream(user, name, f.type, f.stream(), f.size);
      return uploadResponse(req, file);
    }

    if (!req.body) return Response.json({ error: "empty body" }, { status: 400 });
    const name = cleanName(
      req.headers.get("x-file-name") || url.searchParams.get("name") || pathName
    );
    const declared = Number(req.headers.get("content-length") ?? 0) || undefined;
    const mime = ct && !ct.startsWith("application/x-www-form-urlencoded") ? ct.split(";")[0] : "application/octet-stream";
    const file = await storeStream(user, name, mime, req.body, declared);
    return uploadResponse(req, file);
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("upload failed:", err.message);
    return Response.json({ error: err.message }, { status: err.status ?? 500 });
  }
}

export const PUT = handle;
export const POST = handle;

export async function GET() {
  return new Response(
    [
      "cpxo upload endpoint",
      "",
      "  curl -T file.zip https://cpxo.dev/up/cpx_YOURTOKEN/",
      "  curl -T file.zip -H 'Authorization: Bearer cpx_YOURTOKEN' https://cpxo.dev/up",
      "  curl -F file=@file.zip https://cpxo.dev/up?t=cpx_YOURTOKEN",
      "",
    ].join("\n"),
    { headers: { "content-type": "text/plain" } }
  );
}
