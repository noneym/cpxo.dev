// Minimal rotating file logger. Writes to <userData>/logs/cpxo.log and keeps
// three rotated files of at most 1 MB each. Never throws.
'use strict';
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 1024 * 1024;
const KEEP = 3;

let logDir = null;
let logFile = null;

function init(userDataDir) {
  try {
    logDir = path.join(userDataDir, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    logFile = path.join(logDir, 'cpxo.log');
  } catch (err) {
    logDir = null;
    logFile = null;
    console.error('logger init failed', err);
  }
}

function rotateIfNeeded() {
  try {
    const stat = fs.statSync(logFile);
    if (stat.size < MAX_BYTES) return;
    for (let i = KEEP - 1; i >= 1; i--) {
      const from = `${logFile}.${i}`;
      const to = `${logFile}.${i + 1}`;
      if (fs.existsSync(from)) fs.renameSync(from, to);
    }
    fs.renameSync(logFile, `${logFile}.1`);
  } catch (_) {
    // missing file or rename race: ignore
  }
}

function format(level, args) {
  const parts = args.map((a) => {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch (_) { return String(a); }
  });
  return `${new Date().toISOString()} [${level}] ${parts.join(' ')}\n`;
}

function write(level, args) {
  const line = format(level, args);
  if (level === 'error' || level === 'warn') process.stderr.write(line);
  else process.stdout.write(line);
  if (!logFile) return;
  try {
    rotateIfNeeded();
    fs.appendFileSync(logFile, line);
  } catch (_) {
    // disk full / permissions: swallow
  }
}

module.exports = {
  init,
  info: (...a) => write('info', a),
  warn: (...a) => write('warn', a),
  error: (...a) => write('error', a),
  debug: (...a) => write('debug', a),
  get file() { return logFile; },
};
