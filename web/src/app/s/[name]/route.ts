// /s/send and /s/get: stable links to the signed iOS Shortcut files in public/s/.
import { SHORTCUT_FILES, signedShortcutsAvailable } from "@/lib/shortcuts";

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const file = SHORTCUT_FILES[name.replace(/\.shortcut$/, "") as keyof typeof SHORTCUT_FILES];
  if (!file) return Response.json({ error: "unknown shortcut" }, { status: 404 });
  if (!signedShortcutsAvailable()) {
    return Response.json({ error: "signed shortcut files are not published yet; see /docs/ios for manual setup" }, { status: 404 });
  }
  return Response.redirect(new URL(`/s/${file}`, _req.url), 302);
}
