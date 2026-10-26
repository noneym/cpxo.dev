// Rasterizes assets/mark.svg into the tray PNG and the installer ICO.
// Requires the devDependencies `sharp` and `png-to-ico`. The generated
// files are committed, so a build still works when this step is skipped.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'assets', 'mark.svg');
const trayPng = path.join(root, 'assets', 'tray.png');
const trayPng2x = path.join(root, 'assets', 'tray@2x.png');
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
  fs.mkdirSync(path.dirname(iconIco), { recursive: true });

  const render = (size) => sharp(svg, { density: 400 }).resize(size, size).png().toBuffer();

  fs.writeFileSync(trayPng, await render(16));
  fs.writeFileSync(trayPng2x, await render(32));
  fs.writeFileSync(iconPng, await render(256));
  fs.copyFileSync(iconPng, assetIconPng);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(sizes.map(render));
  fs.writeFileSync(iconIco, await pngToIco(pngs));

  console.log('icons: wrote', path.relative(root, trayPng), path.relative(root, trayPng2x),
    path.relative(root, iconPng), path.relative(root, iconIco));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
