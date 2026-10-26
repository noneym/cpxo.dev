// Explorer context menu: HKCU\Software\Classes\*\shell\cpxo
// Registered with reg.exe so no native module is needed.
'use strict';
const { spawn } = require('child_process');
const { app } = require('electron');
const log = require('./logger');

const KEY = 'HKCU\\Software\\Classes\\*\\shell\\cpxo';
const LABEL = 'Upload to cpxo and copy link';

function reg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('reg', args, { windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error((err || out || `reg exited with ${code}`).trim()));
    });
  });
}

/** Command line Explorer runs; in dev the app dir is passed to electron.exe. */
function uploadCommand() {
  const exe = process.execPath;
  if (app.isPackaged) return `"${exe}" --upload "%1"`;
  return `"${exe}" "${app.getAppPath()}" --upload "%1"`;
}

async function register() {
  if (process.platform !== 'win32') return false;
  const exe = process.execPath;
  await reg(['add', KEY, '/ve', '/d', LABEL, '/f']);
  await reg(['add', KEY, '/v', 'Icon', '/d', exe, '/f']);
  await reg(['add', `${KEY}\\command`, '/ve', '/d', uploadCommand(), '/f']);
  log.info('registry: context menu registered');
  return true;
}

async function unregister() {
  if (process.platform !== 'win32') return false;
  try {
    await reg(['delete', KEY, '/f']);
    log.info('registry: context menu removed');
  } catch (err) {
    if (!/unable to find|cannot find/i.test(err.message)) throw err;
  }
  return true;
}

async function isRegistered() {
  if (process.platform !== 'win32') return false;
  try {
    await reg(['query', `${KEY}\\command`, '/ve']);
    return true;
  } catch (_) {
    return false;
  }
}

/** Re-point the command at the current exe (after an update / dev run). */
async function syncIfRegistered() {
  try {
    if (await isRegistered()) await register();
  } catch (err) {
    log.warn('registry: sync failed', err.message);
  }
}

module.exports = { register, unregister, isRegistered, syncIfRegistered, KEY, LABEL };
