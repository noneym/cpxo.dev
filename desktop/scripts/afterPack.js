// electron-builder afterPack hook: ad-hoc sign the macOS app bundle.
// Without any signature Apple Silicon Macs refuse to open the app as "damaged";
// an ad-hoc signature turns that into the normal "unidentified developer" prompt,
// which right-click > Open (or xattr -d com.apple.quarantine) gets past.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  console.log(`  • ad-hoc signing ${appPath}`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], { stdio: "inherit" });
};
