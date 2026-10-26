// Streaming file uploads.
//  - < 100 MB: PUT /up with the raw body (X-File-Name, Content-Type)
//  - >= 100 MB: POST /api/files/presign, PUT to uploadUrl, POST /api/files/complete
// Files are streamed from disk; nothing is buffered in memory. Up to 4 GB.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const api = require('./api');
const log = require('./logger');

const DIRECT_LIMIT = 100 * 1024 * 1024;
const MAX_SIZE = 4 * 1024 * 1024 * 1024;
const IDLE_TIMEOUT_MS = 120000;

const MIME = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/vnd.rar',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.msi': 'application/x-msi',
  '.apk': 'application/vnd.android.package-archive',
  '.iso': 'application/x-iso9660-image',
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Streams a file to `targetUrl` with PUT. Resolves with { status, body }.
 * Reports progress via onProgress(sentBytes, totalBytes).
 */
function streamPut(targetUrl, filePath, size, headers, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const mod = url.protocol === 'http:' ? http : https;
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const req = mod.request(url, {
      method: 'PUT',
      headers: { 'Content-Length': String(size), ...headers },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (settled) return;
        settled = true;
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      });
      res.on('error', fail);
    });

    req.setTimeout(IDLE_TIMEOUT_MS, () => {
      req.destroy(new Error('Upload timed out (no network activity)'));
    });
    req.on('error', fail);

    const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
    let sent = 0;
    let lastReport = 0;
    stream.on('data', (chunk) => {
      sent += chunk.length;
      const now = Date.now();
      if (onProgress && (now - lastReport > 200 || sent === size)) {
        lastReport = now;
        onProgress(sent, size);
      }
    });
    stream.on('error', (err) => {
      req.destroy(err);
      fail(err);
    });
    stream.pipe(req);

    if (signal) {
      signal.addEventListener('abort', () => {
        stream.destroy();
        req.destroy(new Error('Upload cancelled'));
      }, { once: true });
    }
  });
}

function parseJsonResponse(res, what) {
  if (res.status < 200 || res.status >= 300) {
    let msg = `${what} failed (HTTP ${res.status})`;
    try {
      const j = JSON.parse(res.body);
      if (j && j.error) msg = j.error;
    } catch (_) { /* ignore */ }
    if (res.status === 401) msg = 'Invalid or expired token';
    if (res.status === 413) msg = 'File is too large for the server';
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  try { return JSON.parse(res.body); } catch (_) { return {}; }
}

/**
 * Upload a file and resolve with { code, name, size, url, expiresAt }.
 * @param {import('./settings-store').SettingsStore} store
 * @param {string} filePath
 * @param {{ onProgress?: (sent:number, total:number) => void, signal?: AbortSignal }} opts
 */
async function uploadFile(store, filePath, opts = {}) {
  if (!store.isSignedIn) {
    const err = new Error('Not signed in. Add your API token in Settings.');
    err.code = 'NO_TOKEN';
    throw err;
  }
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile()) throw new Error('Only files can be uploaded');
  if (stat.size > MAX_SIZE) throw new Error(`File exceeds the 4 GB limit (${formatBytes(stat.size)})`);
  if (stat.size === 0) throw new Error('File is empty');

  const name = path.basename(filePath);
  const mime = mimeFor(filePath);
  const base = store.serverUrl;
  const token = store.token;
  const onProgress = opts.onProgress || (() => {});

  log.info(`upload: ${name} (${formatBytes(stat.size)}, ${mime})`);

  if (stat.size < DIRECT_LIMIT) {
    const res = await streamPut(`${base}/up`, filePath, stat.size, {
      Authorization: `Bearer ${token}`,
      'X-File-Name': encodeURIComponent(name),
      'Content-Type': mime,
      Accept: 'application/json',
    }, onProgress, opts.signal);
    const json = parseJsonResponse(res, 'Upload');
    if (!json.url) throw new Error('Server did not return a URL');
    log.info(`upload: done ${name} -> ${json.url}`);
    return { ...json, name: json.name || name, size: json.size || stat.size };
  }

  // Large file: presigned upload straight to storage.
  const pre = await api.presign(base, token, { name, size: stat.size, mime });
  if (!pre || !pre.uploadUrl) throw new Error('Server did not return an upload URL');
  const res = await streamPut(pre.uploadUrl, filePath, stat.size, {
    'Content-Type': mime,
  }, onProgress, opts.signal);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Storage upload failed (HTTP ${res.status})`);
  }
  await api.completeUpload(base, token, pre.code);
  log.info(`upload: done ${name} -> ${pre.url}`);
  return { code: pre.code, name, size: stat.size, url: pre.url, expiresAt: pre.expiresAt };
}

module.exports = { uploadFile, formatBytes, mimeFor, DIRECT_LIMIT };
