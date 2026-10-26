// Thin JSON client for the cpxo API (docs/API.md). Uses the global fetch
// available in Electron's main process.
'use strict';

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function headers(token, extra) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function parseError(res) {
  let msg = `HTTP ${res.status}`;
  let body = null;
  try {
    body = await res.json();
    if (body && body.error) msg = body.error;
  } catch (_) { /* not JSON */ }
  if (res.status === 401) msg = 'Invalid or expired token';
  return new ApiError(msg, res.status, body);
}

async function request(baseUrl, token, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: headers(token, options.headers),
      body: options.body,
      signal: controller.signal,
    });
    if (!res.ok && res.status !== 204) throw await parseError(res);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** GET /api/me -> { email } */
async function me(baseUrl, token) {
  const res = await request(baseUrl, token, '/api/me');
  return res.json();
}

/** POST /api/clip -> { id, createdAt, source } */
async function pushClip(baseUrl, token, text, source = 'windows') {
  const res = await request(baseUrl, token, '/api/clip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source }),
  });
  return res.json();
}

/**
 * GET /api/clip?since=<id>&format=json
 * Resolves with { id, text, source, createdAt } or null on 204.
 */
async function latestClip(baseUrl, token, sinceId) {
  const q = new URLSearchParams({ format: 'json' });
  if (sinceId) q.set('since', String(sinceId));
  const res = await request(baseUrl, token, `/api/clip?${q}`);
  if (res.status === 204) return null;
  return res.json();
}

/** POST /api/files/presign -> { uploadUrl, code, url, expiresAt } */
async function presign(baseUrl, token, { name, size, mime }) {
  const res = await request(baseUrl, token, '/api/files/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, size, mime }),
  });
  return res.json();
}

/** POST /api/files/complete */
async function completeUpload(baseUrl, token, code) {
  const res = await request(baseUrl, token, '/api/files/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    timeoutMs: 60000,
  });
  try { return await res.json(); } catch (_) { return { ok: true }; }
}

function isNetworkError(err) {
  if (!err) return false;
  if (err instanceof ApiError) return err.status >= 500;
  const code = err.cause && err.cause.code;
  return err.name === 'AbortError' || err.name === 'TypeError' || !!code;
}

module.exports = { ApiError, me, pushClip, latestClip, presign, completeUpload, isNetworkError };
