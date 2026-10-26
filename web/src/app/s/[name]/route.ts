// Short, stable links for the signed iOS Shortcuts: /s/send and /s/get
// redirect to the latest GitHub release asset (signed on a macOS runner).
const FILES: Record<string, string> = {
  send: "cpxo-send-to-windows.shortcut",
  get: "cpxo-get-from-windows.shortcut",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const file = FILES[name.replace(/\.shortcut$/, "")];
  if (!file) return Response.json({ error: "unknown shortcut" }, { status: 404 });
  return Response.redirect(`https://github.com/noneym/cpxo.dev/releases/latest/download/${file}`, 302);
}
