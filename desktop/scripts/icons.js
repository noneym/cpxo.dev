// Rasterizes assets/mark.svg into the tray PNG, the Windows installer ICO and
// the 1024px build/icon.png that electron-builder converts to .icns on macOS,
// and assets/mark-mono.svg into the macOS menu bar Template images.
// Requires the devDependencies `sharp` and `png-to-ico`. The generated
// files are committed, so a build still works when this step is skipped.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'assets', 'mark.svg');
const monoSvgPath = path.join(root, 'assets', 'mark-mono.svg');
const trayPng = path.join(root, 'assets', 'tray.png');
const trayPng2x = path.join(root, 'assets', 'tray@2x.png');
// macOS menu bar: black on transparent; the "Template" suffix makes AppKit
// recolour it for light/dark menu bars.
const trayTemplatePng = path.join(root, 'assets', 'trayTemplate.png');
const trayTemplatePng2x = path.join(root, 'assets', 'trayTemplate@2x.png');
const iconPng = path.join(root, 'build', 'icon.png');
const assetIconPng = path.join(root, 'assets', 'icon.png');
const iconIco = path.join(root, 'build', 'icon.ico');

async function main() {
  let sharp, pngToIco;
  try {
    sharp = require('sharp');
    pngToIco = require('png-to-ico');
  } catch (err) {
    console.error('icons: sharp / png-to-ico are not installed (npm install). ' + err.message);
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath);
  // mark-mono.svg paints with currentColor; resolve it to solid black.
  const monoSvg = Buffer.from(
    fs.readFileSync(monoSvgPath, 'utf8').replace(/currentColor/g, '#000000'),
  );
  fs.mkdirSync(path.dirname(iconIco), { recursive: true });

  const render = (size, src = svg) => sharp(src, { density: 400 }).resize(size, size).png().toBuffer();

  fs.writeFileSync(trayPng, await render(16));
  fs.writeFileSync(trayPng2x, await render(32));
  fs.writeFileSync(trayTemplatePng, await render(16, monoSvg));
  fs.writeFileSync(trayTemplatePng2x, await render(32, monoSvg));
  // build/icon.png: 1024px source for electron-builder (.icns on macOS).
  fs.writeFileSync(iconPng, await render(1024));
  // assets/icon.png: used at runtime for notifications and window icons.
  fs.writeFileSync(assetIconPng, await render(256));

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(sizes.map((s) => render(s)));
  fs.writeFileSync(iconIco, await pngToIco(pngs));

  console.log('icons: wrote', [trayPng, trayPng2x, trayTemplatePng, trayTemplatePng2x,
    iconPng, assetIconPng, iconIco].map((f) => path.relative(root, f)).join(' '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
