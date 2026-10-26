import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const candidates = [
    path.join(process.cwd(), "..", "cli", "cpxo"),
    path.join(process.cwd(), "cli", "cpxo"),
    path.join(process.cwd(), "public", "cpxo.sh"),
  ];
  for (const p of candidates) {
    try {
      let script = await readFile(p, "utf8");
      script = script.replace("https://cpxo.dev}", `${config.appUrl}}`);
      return new Response(script, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
    } catch {}
  }
  return new Response("cli script missing", { status: 404 });
}
