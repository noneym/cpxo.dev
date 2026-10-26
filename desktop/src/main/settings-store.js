// Settings persisted as JSON in app.getPath('userData')/settings.json.
'use strict';
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const DEFAULTS = {
  serverUrl: 'https://cpxo.dev',
  token: '',
  launchAtLogin: false,
  syncClipboard: true,
  notifications: true,
  contextMenu: false,
  lastClipId: 0,
};

class SettingsStore extends EventEmitter {
  constructor(userDataDir) {
    super();
    this.file = path.join(userDataDir, 'settings.json');
    this.data = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = { ...DEFAULTS, ...parsed };
    } catch (_) {
      this.data = { ...DEFAULTS };
    }
    return this.data;
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      this.emit('error', err);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    if (this.data[key] === value) return;
    this.data[key] = value;
    this.save();
    this.emit('change', key, value, this.data);
  }

  update(patch) {
    const changed = [];
    for (const [k, v] of Object.entries(patch)) {
      if (!(k in DEFAULTS)) continue;
      if (this.data[k] !== v) {
        this.data[k] = v;
        changed.push(k);
      }
    }
    if (changed.length) {
      this.save();
      for (const k of changed) this.emit('change', k, this.data[k], this.data);
    }
    return changed;
  }

  all() {
    return { ...this.data };
  }

  /** Normalized base URL without trailing slash. */
  get serverUrl() {
    const url = (this.data.serverUrl || DEFAULTS.serverUrl).trim();
    return url.replace(/\/+$/, '') || DEFAULTS.serverUrl;
  }

  get token() {
    return (this.data.token || '').trim();
  }

  get isSignedIn() {
    return this.token.length > 0;
  }
}

module.exports = { SettingsStore, DEFAULTS };
