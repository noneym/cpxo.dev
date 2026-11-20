import { existsSync } from "node:fs";
import path from "node:path";

export const SHORTCUT_FILES = {
  send: "cpxo-send-to-windows.shortcut",
  get: "cpxo-get-from-windows.shortcut",
} as const;

/** Shortcuts shared from an iPhone ("Copy iCloud Link"). One listed here wins over the signed file in public/s/. */
export const ICLOUD_LINKS: Partial<Record<keyof typeof SHORTCUT_FILES, string>> = {
  send: "https://www.icloud.com/shortcuts/6681ad04e5574fcfa0f3ade46f354a11",
};

/** Signed shortcut files are dropped into web/public/s/ by hand (signing needs a Mac with iCloud). */
export function signedShortcutsAvailable() {
  const dir = path.join(process.cwd(), "public", "s");
  return Object.values(SHORTCUT_FILES).every((f) => existsSync(path.join(dir, f)));
}
