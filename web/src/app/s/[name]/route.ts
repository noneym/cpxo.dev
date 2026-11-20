// /s/send and /s/get: stable links to the iOS Shortcuts: an iCloud link when one is set, else the signed file in public/s/.
import { ICLOUD_LINKS, SHORTCUT_FILES, signedShortcutsAvailable } from "@/lib/shortcuts";
import { config } from "@/lib/config";

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const key = name.replace(/\.shortcut$/, "") as keyof typeof SHORTCUT_FILES;
  const file = SHORTCUT_FILES[key];
  if (!file) return Response.json({ error: "unknown shortcut" }, { status: 404 });
  const icloud = ICLOUD_LINKS[key];
  if (icloud) return Response.redirect(icloud, 302);
  if (!signedShortcutsAvailable()) {
    return Response.json({ error: "signed shortcut files are not published yet; see /docs/ios for manual setup" }, { status: 404 });
  }
  return Response.redirect(`${config.appUrl}/s/${file}`, 302);
}
