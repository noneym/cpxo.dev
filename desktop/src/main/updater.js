// Auto-update through GitHub Releases (electron-updater). Windows uses the NSIS
// installer, macOS the signed zip; electron-builder writes latest.yml /
// latest-mac.yml next to the artifacts and CI attaches them to the release.
'use strict';
const { app } = require('electron');
const log = require('./logger');

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

let autoUpdater = null;
let downloaded = null; // version string once an update is ready
let notifyFn = () => {};
let onState = () => {};
let interactiveCheck = false;

function init({ notify, onStateChange }) {
  notifyFn = notify || notifyFn;
  onState = onStateChange || onState;
  if (!app.isPackaged) {
    log.info('updater: dev build, auto-update off');
    return;
  }
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    log.warn('updater: electron-updater not available', err.message);
    return;
  }
  autoUpdater.logger = { info: (m) => log.info(`updater: ${m}`), warn: (m) => log.warn(`updater: ${m}`), error: (m) => log.error(`updater: ${m}`), debug: () => {} };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    log.info(`updater: downloading ${info.version}`);
    onState({ status: 'downloading', version: info.version });
    if (interactiveCheck) notifyFn(`Downloading cpxo ${info.version}`, 'You will be told when it is ready to install.');
  });
  autoUpdater.on('update-not-available', () => {
    onState({ status: 'idle' });
    if (interactiveCheck) notifyFn('Up to date', `cpxo ${app.getVersion()} is the latest version.`);
    interactiveCheck = false;
  });
  autoUpdater.on('update-downloaded', (info) => {
    downloaded = info.version;
    onState({ status: 'ready', version: info.version });
    notifyFn(`cpxo ${info.version} is ready`, 'Click to restart and update. It also installs when you quit.', () => quitAndInstall());
  });
  autoUpdater.on('error', (err) => {
    log.warn(`updater: ${err && err.message}`);
    onState({ status: 'idle' });
  });

  setTimeout(() => check(false), 20_000);
  setInterval(() => check(false), CHECK_EVERY_MS).unref();
}

/** Manual or scheduled check. interactive=true reports "up to date" too. */
async function check(interactive) {
  if (!autoUpdater) {
    if (interactive) notifyFn('Updates', 'Auto-update works in the installed app only.');
    return;
  }
  if (downloaded) {
    if (interactive) quitAndInstall();
    return;
  }
  interactiveCheck = !!interactive;
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    log.warn(`updater: check failed ${err && err.message}`);
    const msg = String(err && err.message);
    if (interactive) notifyFn('Update check failed', /NAME_NOT_RESOLVED|ENOTFOUND|INTERNET_DISCONNECTED/.test(msg) ? 'No connection to github.com (DNS). Try again in a moment.' : msg.slice(0, 120));
    interactiveCheck = false;
  }
}

function quitAndInstall() {
  if (!autoUpdater || !downloaded) return;
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
}

function readyVersion() {
  return downloaded;
}

module.exports = { init, check, quitAndInstall, readyVersion };
