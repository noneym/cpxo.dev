// cpxo desktop: tray app entry point.
'use strict';
const fs = require('fs');
const path = require('path');
const {
  app, BrowserWindow, Notification, clipboard, dialog, ipcMain, shell, nativeImage,
} = require('electron');

const log = require('./logger');
const { SettingsStore } = require('./settings-store');
const { ClipboardSync } = require('./clipboard');
const { AppTray } = require('./tray');
const { uploadFile, formatBytes } = require('./uploader');
const registry = require('./registry');
const api = require('./api');

const PROGRESS_WINDOW_MIN_BYTES = 10 * 1024 * 1024;
const RENDERER = path.join(__dirname, '..', 'renderer');
const PRELOAD = path.join(__dirname, 'preload.js');
const APP_ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png');

let store;
let tray;
let sync;
let settingsWin = null;
let progressWin = null;
let quitting = false;
const uploadQueue = [];
let uploading = false;

// --- single instance ---------------------------------------------------------

// Electron (in dev) and Chromium interleave their own switches with ours, so
// the value for --upload is the next argument that is not a switch.
function parseUploadArgs(argv) {
  const files = [];
  const appPath = app.getAppPath();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--upload=')) {
      files.push(a.slice('--upload='.length));
      continue;
    }
    if (a !== '--upload') continue;
    for (let j = i + 1; j < argv.length; j++) {
      const v = argv[j];
      if (v.startsWith('-') || v === appPath) continue;
      files.push(v);
      i = j;
      break;
    }
  }
  return files.filter((f) => f && f.trim()).map((f) => path.resolve(f));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Another instance is running; it receives our argv via 'second-instance'.
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const files = parseUploadArgs(argv);
    log.info('second instance argv:', JSON.stringify(argv));
    log.info('second instance:', files.length ? `upload ${files.length} file(s)` : 'open settings');
    if (files.length) enqueueUploads(files);
    else openSettings();
  });
  app.whenReady().then(main).catch((err) => {
    log.error('startup failed', err);
    dialog.showErrorBox('cpxo', `Failed to start: ${err.message}`);
    app.quit();
  });
}

// --- startup -----------------------------------------------------------------

async function main() {
  log.init(app.getPath('userData'));
  log.info(`cpxo ${app.getVersion()} starting (${app.isPackaged ? 'packaged' : 'dev'})`);
  app.setAppUserModelId('dev.cpxo.desktop');

  store = new SettingsStore(app.getPath('userData'));
  store.on('error', (err) => log.error('settings save failed', err));

  // Stay alive with all windows closed (tray app).
  app.on('window-all-closed', () => { /* keep running */ });
  app.on('before-quit', () => { quitting = true; });

  sync = new ClipboardSync(store);
  sync.on('received', onClipReceived);
  sync.on('online', (online) => tray.update({ online }));
  sync.on('unauthorized', () => {
    notify('Signed out', 'Your cpxo token was rejected. Open Settings to sign in again.');
    tray.update({ signedIn: false });
  });

  tray = new AppTray({
    onPaste: pasteFromPhone,
    onUpload: pickAndUpload,
    onToggleSync: (checked) => store.set('syncClipboard', checked),
    onDashboard: () => shell.openExternal(`${store.serverUrl}/dashboard`),
    onSettings: openSettings,
    onQuit: () => { quitting = true; app.quit(); },
  });
  tray.update({ signedIn: store.isSignedIn, syncClipboard: store.get('syncClipboard') });

  store.on('change', onSettingChanged);
  applyLoginItem();
  if (store.get('contextMenu')) registry.syncIfRegistered();

  if (store.isSignedIn && store.get('syncClipboard')) sync.start();

  const files = parseUploadArgs(process.argv);
  if (files.length) enqueueUploads(files);
  else if (!store.isSignedIn) openSettings();

  ipc();
  log.info('ready');
}

function onSettingChanged(key, value) {
  switch (key) {
    case 'token':
    case 'serverUrl':
      tray.update({ signedIn: store.isSignedIn, online: true });
      if (key === 'serverUrl') store.set('lastClipId', 0);
      if (store.isSignedIn && store.get('syncClipboard')) sync.restart();
      else sync.stop();
      break;
    case 'syncClipboard':
      tray.update({ syncClipboard: value });
      if (value && store.isSignedIn) sync.start();
      else sync.stop();
      break;
    case 'launchAtLogin':
      applyLoginItem();
      break;
    case 'contextMenu':
      (value ? registry.register() : registry.unregister()).catch((err) => {
        log.error('registry', err);
        notify('Context menu', `Could not update Explorer menu: ${err.message}`);
      });
      break;
    default:
      break;
  }
}

function applyLoginItem() {
  if (!app.isPackaged) return; // would register electron.exe in dev
  try {
    app.setLoginItemSettings({
      openAtLogin: !!store.get('launchAtLogin'),
      path: process.execPath,
      args: [],
    });
  } catch (err) {
    log.warn('setLoginItemSettings failed', err.message);
  }
}

// --- notifications -----------------------------------------------------------

function notify(title, body, onClick) {
  if (!store.get('notifications')) return;
  if (!Notification.isSupported()) return;
  try {
    const n = new Notification({
      title,
      body: body.length > 200 ? `${body.slice(0, 197)}...` : body,
      icon: nativeImage.createFromPath(APP_ICON),
      silent: true,
    });
    if (onClick) n.on('click', onClick);
    n.show();
  } catch (err) {
    log.warn('notification failed', err.message);
  }
}

function sourceLabel(source) {
  if (source === 'ios') return 'iPhone';
  if (source === 'cli') return 'CLI';
  if (source === 'windows') return 'Windows';
  return source || 'cpxo';
}

function onClipReceived(clip) {
  const preview = (clip.text || '').replace(/\s+/g, ' ').trim();
  notify(`Copied from ${sourceLabel(clip.source)}`, preview.slice(0, 80));
}

// --- clipboard actions -------------------------------------------------------

async function pasteFromPhone() {
  if (!store.isSignedIn) return openSettings();
  try {
    const clip = await api.latestClip(store.serverUrl, store.token, 0);
    if (!clip || !clip.text) {
      notify('Nothing to paste', 'Your cpxo clipboard is empty.');
      return;
    }
    sync.markOwnWrite(clip.text);
    clipboard.writeText(clip.text);
    if (typeof clip.id === 'number') sync.rememberId(clip.id);
    onClipReceived(clip);
  } catch (err) {
    log.error('paste failed', err);
    notify('Paste failed', err.message);
  }
}

// --- uploads -----------------------------------------------------------------

async function pickAndUpload() {
  if (!store.isSignedIn) return openSettings();
  const res = await dialog.showOpenDialog({
    title: 'Upload to cpxo',
    properties: ['openFile', 'multiSelections'],
  });
  if (res.canceled || !res.filePaths.length) return;
  enqueueUploads(res.filePaths);
}

function enqueueUploads(files) {
  if (!store.isSignedIn) {
    notify('Not signed in', 'Add your cpxo API token in Settings to upload files.');
    openSettings();
    return;
  }
  for (const f of files) uploadQueue.push(f);
  if (!uploading) drainUploads();
}

async function drainUploads() {
  uploading = true;
  while (uploadQueue.length) {
    const file = uploadQueue.shift();
    await uploadOne(file);
  }
  uploading = false;
  tray.setProgress(null);
  closeProgress();
}

async function uploadOne(filePath) {
  const name = path.basename(filePath);
  let showWindow = false;
  try {
    const stat = await fs.promises.stat(filePath);
    showWindow = stat.size >= PROGRESS_WINDOW_MIN_BYTES;
  } catch (_) { /* uploadFile reports the error */ }

  if (showWindow) showProgress({ name, percent: 0, sent: 0, total: 0 });
  tray.setProgress({ name, percent: 0 });
  sendToSettings('upload:started', { name, path: filePath });

  try {
    const result = await uploadFile(store, filePath, {
      onProgress: (sent, total) => {
        const percent = total ? Math.floor((sent / total) * 100) : 0;
        tray.setProgress({ name, percent });
        if (showWindow) showProgress({ name, percent, sent, total });
        sendToSettings('upload:progress', { name, path: filePath, percent });
      },
    });
    sync.markOwnWrite(result.url);
    clipboard.writeText(result.url);
    notify('Link copied', result.url, () => shell.openExternal(result.url));
    sendToSettings('upload:done', { name, path: filePath, url: result.url, size: result.size });
  } catch (err) {
    log.error(`upload failed: ${name}`, err);
    notify('Upload failed', `${name}: ${err.message}`);
    sendToSettings('upload:error', { name, path: filePath, error: err.message });
    if (err.code === 'NO_TOKEN') openSettings();
  }
}

// --- windows -----------------------------------------------------------------

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 380,
    minHeight: 520,
    show: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    title: 'cpxo settings',
    backgroundColor: '#0B0D10',
    icon: nativeImage.createFromPath(APP_ICON),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(RENDERER, 'settings.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
  settingsWin.webContents.on('console-message', (details) => {
    const d = details && typeof details === 'object' && 'level' in details ? details : null;
    if (d && (d.level === 'error' || d.level === 'warning')) log.warn('renderer:', d.message);
  });
  settingsWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function sendToSettings(channel, payload) {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.webContents.send(channel, payload);
  }
}

function showProgress(state) {
  if (!progressWin || progressWin.isDestroyed()) {
    progressWin = new BrowserWindow({
      width: 360,
      height: 96,
      show: false,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      backgroundColor: '#0B0D10',
      webPreferences: {
        preload: PRELOAD,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    progressWin.loadFile(path.join(RENDERER, 'progress.html'));
    progressWin.once('ready-to-show', () => {
      const { screen } = require('electron');
      const area = screen.getPrimaryDisplay().workArea;
      const [w, h] = progressWin.getSize();
      progressWin.setPosition(area.x + area.width - w - 16, area.y + area.height - h - 16);
      progressWin.showInactive();
    });
    progressWin.on('closed', () => { progressWin = null; });
  }
  const payload = { ...state, sentLabel: formatBytes(state.sent || 0), totalLabel: formatBytes(state.total || 0) };
  if (progressWin.webContents.isLoading()) {
    progressWin.webContents.once('did-finish-load', () => {
      if (progressWin && !progressWin.isDestroyed()) progressWin.webContents.send('progress', payload);
    });
  } else {
    progressWin.webContents.send('progress', payload);
  }
}

function closeProgress() {
  if (progressWin && !progressWin.isDestroyed()) {
    const win = progressWin;
    progressWin = null;
    setTimeout(() => { if (!win.isDestroyed()) win.close(); }, 600);
  }
}

// --- ipc ---------------------------------------------------------------------

function ipc() {
  ipcMain.handle('settings:get', () => ({
    ...store.all(),
    isPackaged: app.isPackaged,
    version: app.getVersion(),
    logFile: log.file,
  }));

  ipcMain.handle('settings:save', (_e, patch) => {
    const clean = {};
    if (typeof patch.serverUrl === 'string') {
      let url = patch.serverUrl.trim();
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      clean.serverUrl = url.replace(/\/+$/, '') || 'https://cpxo.dev';
    }
    if (typeof patch.token === 'string') clean.token = patch.token.trim();
    for (const k of ['launchAtLogin', 'syncClipboard', 'notifications', 'contextMenu']) {
      if (typeof patch[k] === 'boolean') clean[k] = patch[k];
    }
    store.update(clean);
    return store.all();
  });

  ipcMain.handle('settings:test', async (_e, { serverUrl, token }) => {
    let url = (serverUrl || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    url = url.replace(/\/+$/, '') || 'https://cpxo.dev';
    const tok = (token || '').trim();
    if (!tok) return { ok: false, error: 'Enter your API token first.' };
    try {
      const me = await api.me(url, tok);
      return { ok: true, email: me.email };
    } catch (err) {
      const msg = err.name === 'AbortError' ? 'Server did not respond.'
        : err.status ? err.message
        : `Could not reach ${url}`;
      return { ok: false, error: msg };
    }
  });

  ipcMain.handle('upload:files', (_e, paths) => {
    if (Array.isArray(paths) && paths.length) enqueueUploads(paths.filter((p) => typeof p === 'string'));
    return true;
  });

  ipcMain.handle('upload:pick', () => pickAndUpload());

  ipcMain.handle('shell:open', (_e, url) => {
    if (typeof url === 'string' && /^https?:/i.test(url)) shell.openExternal(url);
  });

  ipcMain.handle('shell:openLog', () => {
    if (log.file) shell.showItemInFolder(log.file);
  });

  ipcMain.handle('window:close', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.close();
  });
}

process.on('uncaughtException', (err) => {
  log.error('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  log.error('unhandledRejection', reason instanceof Error ? reason : String(reason));
});
