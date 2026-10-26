import { existsSync } from "node:fs";
import path from "node:path";

export const SHORTCUT_FILES = {
  send: "cpxo-send-to-windows.shortcut",
  get: "cpxo-get-from-windows.shortcut",
} as const;

/** Signed shortcut files are dropped into web/public/s/ by hand (signing needs a Mac with iCloud). */
export function signedShortcutsAvailable() {
  const dir = path.join(process.cwd(), "public", "s");
  return Object.values(SHORTCUT_FILES).every((f) => existsSync(path.join(dir, f)));
}
