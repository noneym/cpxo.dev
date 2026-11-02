// Bundles dist/ into the zip SiYuan expects: plugin.json, index.js, icon.png,
// README.md and i18n/ at the archive root. Install by extracting it into
// <workspace>/data/plugins/cpxo-siyuan/.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { zipSync } from "fflate";

const root = new URL("..", import.meta.url);
const dist = new URL("dist/", root);
const manifest = JSON.parse(readFileSync(new URL("plugin.json", root), "utf8"));

mkdirSync(new URL("i18n/", dist), { recursive: true });
for (const f of ["plugin.json", "icon.png", "README.md"]) copyFileSync(new URL(f, root), new URL(f, dist));
for (const f of readdirSync(new URL("i18n/", root))) copyFileSync(new URL(`i18n/${f}`, root), new URL(`i18n/${f}`, dist));

const files = {};
for (const f of ["plugin.json", "index.js", "icon.png", "README.md"]) files[f] = readFileSync(new URL(f, dist));
for (const f of readdirSync(new URL("i18n/", root))) files[`i18n/${f}`] = readFileSync(new URL(`i18n/${f}`, dist));

const out = new URL(`cpxo-siyuan-${manifest.version}.zip`, dist);
writeFileSync(out, zipSync(files, { level: 9 }));
console.log(`wrote ${out.pathname.replace(/^\/([A-Z]:)/, "$1")} (${Object.keys(files).length} files)`);
