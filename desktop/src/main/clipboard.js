// Two-way clipboard sync.
//  - polls the local clipboard every 500 ms and pushes changes to POST /api/clip
//  - polls GET /api/clip?since=<lastId>&format=json every 2 s and applies clips
//    that came from other sources
// Network failures back off exponentially (2 s .. 60 s) and never throw.
'use strict';
const { clipboard } = require('electron');
const { EventEmitter } = require('events');
const api = require('./api');
const log = require('./logger');

// What this machine reports as the clip origin.
const SOURCE = process.platform === 'darwin' ? 'mac' : 'windows';

const LOCAL_POLL_MS = 500;

/** clipboard.readText() returns a string on Electron <= 44 and a Promise from 45 on. */
async function readClipText() {
  const v = await clipboard.readText();
  return typeof v === 'string' ? v : '';
}
/** clipboard.writeText() may also be async on newer Electron. */
async function writeClipText(text) {
  await clipboard.writeText(text);
}

const REMOTE_POLL_MS = 2000;
const MAX_BACKOFF_MS = 60000;
const MAX_TEXT_BYTES = 512 * 1024;

class ClipboardSync extends EventEmitter {
  /**
   * @param {import('./settings-store').SettingsStore} store
   */
  constructor(store) {
    super();
    this.store = store;
    this.running = false;
    this.localTimer = null;
    this.remoteTimer = null;
    this.lastLocalText = null;      // last text seen on the local clipboard
    this.lastSetText = null;        // text we wrote ourselves (ignored by watcher)
    this.backoffMs = 0;
    this.pushing = false;
    this.pendingText = null;
    this.primed = false;            // first remote poll only records the latest id
    this.online = true;
  }

  start() {
    if (this.running) return;
    if (!this.store.isSignedIn) {
      log.info('clipboard: not starting, no token');
      return;
    }
    this.running = true;
    this.backoffMs = 0;
    this.primed = this.store.get('lastClipId') > 0;
    log.info(`clipboard: sync started, lastClipId=${this.store.get('lastClipId')}`);
    readClipText()
      .catch(() => '')
      .then((t) => {
        if (!this.running) return;
        this.lastLocalText = t;
        this.scheduleLocal();
      });
    this.scheduleRemote(0);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    clearTimeout(this.localTimer);
    clearTimeout(this.remoteTimer);
    this.localTimer = null;
    this.remoteTimer = null;
    log.info('clipboard: sync stopped');
  }

  restart() {
    this.stop();
    this.start();
  }

  // ---- local -> server ---------------------------------------------------

  scheduleLocal() {
    if (!this.running) return;
    this.localTimer = setTimeout(() => this.tickLocal(), LOCAL_POLL_MS);
  }

  async tickLocal() {
    if (!this.running) return;
    try {
      const text = await readClipText();
      if (text !== this.lastLocalText) {
        this.lastLocalText = text;
        if (text && text.trim() && text !== this.lastSetText) {
          this.queuePush(text);
        }
      }
    } catch (err) {
      log.warn('clipboard: readText failed', err.message);
    }
    this.scheduleLocal();
  }

  queuePush(text) {
    if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) {
      log.info('clipboard: skipping clip over 512 KB');
      return;
    }
    this.pendingText = text;
    if (!this.pushing) this.flushPush();
  }

  async flushPush() {
    while (this.pendingText !== null && this.running) {
      const text = this.pendingText;
      this.pendingText = null;
      this.pushing = true;
      try {
        const res = await api.pushClip(this.store.serverUrl, this.store.token, text, SOURCE);
        if (res && typeof res.id === 'number') this.rememberId(res.id);
        this.setOnline(true);
        log.info(`clipboard: pushed clip id=${res && res.id} (${text.length} chars)`);
        this.emit('pushed', res);
      } catch (err) {
        this.handleError('push', err);
        // Keep the latest text for a retry on the next remote tick.
        if (this.pendingText === null) this.pendingText = text;
        break;
      } finally {
        this.pushing = false;
      }
    }
  }

  // ---- server -> local ---------------------------------------------------

  scheduleRemote(delay) {
    if (!this.running) return;
    clearTimeout(this.remoteTimer);
    this.remoteTimer = setTimeout(() => this.tickRemote(), delay == null ? REMOTE_POLL_MS : delay);
  }

  async tickRemote() {
    if (!this.running) return;
    try {
      const since = this.primed ? this.store.get('lastClipId') : 0;
      const clip = await api.latestClip(this.store.serverUrl, this.store.token, since);
      this.setOnline(true);
      this.backoffMs = 0;
      if (clip && typeof clip.id === 'number') {
        const isNew = clip.id > (this.store.get('lastClipId') || 0);
        this.rememberId(clip.id);
        if (this.primed && isNew && clip.source !== SOURCE) {
          this.applyRemote(clip);
        }
      }
      this.primed = true;
      // Retry a push that failed earlier now that the server answered.
      if (this.pendingText !== null && !this.pushing) this.flushPush();
      this.scheduleRemote();
    } catch (err) {
      this.handleError('poll', err);
      this.scheduleRemote(this.backoffMs);
    }
  }

  async applyRemote(clip) {
    const text = clip.text || '';
    if (!text) return;
    try {
      this.lastSetText = text;
      this.lastLocalText = text;
      await writeClipText(text);
      log.info(`clipboard: applied clip id=${clip.id} from ${clip.source}`);
      this.emit('received', clip);
    } catch (err) {
      log.error('clipboard: writeText failed', err);
    }
  }

  rememberId(id) {
    const cur = this.store.get('lastClipId') || 0;
    if (id > cur) this.store.set('lastClipId', id);
  }

  handleError(what, err) {
    if (err && err.status === 401) {
      log.warn('clipboard: unauthorized, stopping sync');
      this.stop();
      this.emit('unauthorized');
      return;
    }
    this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, MAX_BACKOFF_MS) : REMOTE_POLL_MS;
    this.setOnline(false);
    log.warn(`clipboard: ${what} failed (${err && err.message}); retry in ${this.backoffMs} ms`);
  }

  setOnline(value) {
    if (this.online === value) return;
    this.online = value;
    this.emit('online', value);
  }

  /** Mark text as written by us so the watcher does not echo it back. */
  markOwnWrite(text) {
    this.lastSetText = text;
    this.lastLocalText = text;
  }
}

module.exports = { ClipboardSync };
