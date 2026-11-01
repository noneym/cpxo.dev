// electron-builder afterPack hook for macOS.
// With a Developer ID certificate (CSC_LINK set) electron-builder signs and
// notarizes the app itself after this hook, so we do nothing.
// Without one (forks, local builds) we ad-hoc sign: an unsigned binary is
// reported as "damaged" on Apple Silicon, an ad-hoc signature turns that into
// the normal "unidentified developer" prompt (right-click > Open).
const { execFileSync } = require("node:child_process");
const path = require("node:path");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  if (process.env.CSC_LINK || process.env.CSC_NAME) {
    console.log("  • Developer ID certificate present, electron-builder signs and notarizes");
    return;
  }
  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  console.log(`  • no certificate: ad-hoc signing ${appPath}`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], { stdio: "inherit" });
};
