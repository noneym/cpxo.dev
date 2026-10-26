'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const fields = {
    serverUrl: $('serverUrl'),
    token: $('token'),
    syncClipboard: $('syncClipboard'),
    notifications: $('notifications'),
    launchAtLogin: $('launchAtLogin'),
    contextMenu: $('contextMenu'),
  };
  const testBtn = $('test');
  const testResult = $('testResult');
  const saveBtn = $('save');
  const saveStatus = $('saveStatus');
  const drop = $('drop');
  const uploads = $('uploads');
  let statusTimer = null;

  function setStatus(el, text, kind) {
    el.textContent = '';
    el.className = `status${kind ? ` ${kind}` : ''}`;
    if (typeof text === 'string') el.textContent = text;
    else if (text) el.appendChild(text);
  }

  function flashSaved(text) {
    setStatus(saveStatus, text, 'ok');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => setStatus(saveStatus, ''), 2500);
  }

  function collect() {
    return {
      serverUrl: fields.serverUrl.value,
      token: fields.token.value,
      syncClipboard: fields.syncClipboard.checked,
      notifications: fields.notifications.checked,
      launchAtLogin: fields.launchAtLogin.checked,
      contextMenu: fields.contextMenu.checked,
    };
  }

  function fill(s) {
    fields.serverUrl.value = s.serverUrl || '';
    fields.token.value = s.token || '';
    fields.syncClipboard.checked = !!s.syncClipboard;
    fields.notifications.checked = !!s.notifications;
    fields.launchAtLogin.checked = !!s.launchAtLogin;
    fields.contextMenu.checked = !!s.contextMenu;
    $('version').textContent = `v${s.version}`;
    $('devHint').hidden = !!s.isPackaged;
  }

  async function load() {
    const s = await window.cpxo.getSettings();
    fill(s);
  }

  async function save() {
    saveBtn.disabled = true;
    try {
      await window.cpxo.saveSettings(collect());
      flashSaved('Saved');
    } catch (err) {
      setStatus(saveStatus, err.message || 'Save failed', 'err');
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function test() {
    testBtn.disabled = true;
    setStatus(testResult, 'Connecting...');
    try {
      const r = await window.cpxo.testConnection(fields.serverUrl.value, fields.token.value);
      if (r.ok) {
        const span = document.createElement('span');
        span.textContent = 'Signed in as ';
        const email = document.createElement('span');
        email.className = 'mono';
        email.textContent = r.email;
        span.appendChild(email);
        setStatus(testResult, span, 'ok');
      } else {
        setStatus(testResult, r.error, 'err');
      }
    } catch (err) {
      setStatus(testResult, err.message || 'Test failed', 'err');
    } finally {
      testBtn.disabled = false;
    }
  }

  // Checkbox changes apply immediately; text fields need Save.
  for (const k of ['syncClipboard', 'notifications', 'launchAtLogin', 'contextMenu']) {
    fields[k].addEventListener('change', async () => {
      try {
        await window.cpxo.saveSettings({ [k]: fields[k].checked });
        flashSaved('Saved');
      } catch (err) {
        setStatus(saveStatus, err.message || 'Save failed', 'err');
      }
    });
  }

  saveBtn.addEventListener('click', save);
  testBtn.addEventListener('click', test);
  fields.token.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  fields.serverUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });

  $('toggleToken').addEventListener('click', (e) => {
    const hidden = fields.token.type === 'password';
    fields.token.type = hidden ? 'text' : 'password';
    e.currentTarget.textContent = hidden ? 'Hide' : 'Show';
  });

  $('dashboardLink').addEventListener('click', (e) => {
    e.preventDefault();
    const base = (fields.serverUrl.value || 'https://cpxo.dev').replace(/\/+$/, '');
    window.cpxo.openExternal(`${base}/dashboard`);
  });

  $('openLog').addEventListener('click', () => window.cpxo.openLog());
  $('pick').addEventListener('click', () => window.cpxo.pickFiles());

  // --- drag and drop -------------------------------------------------------

  function filesFromEvent(e) {
    const out = [];
    const list = e.dataTransfer && e.dataTransfer.files;
    if (!list) return out;
    for (const f of list) {
      try {
        const p = window.cpxo.pathForFile(f);
        if (p) out.push(p);
      } catch (_) { /* ignore */ }
    }
    return out;
  }

  ['dragenter', 'dragover'].forEach((type) => {
    document.addEventListener(type, (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      drop.classList.add('over');
    });
  });
  ['dragleave', 'dragend'].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (type === 'dragleave' && e.relatedTarget && document.contains(e.relatedTarget)) return;
      drop.classList.remove('over');
    });
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const paths = filesFromEvent(e);
    if (paths.length) window.cpxo.uploadFiles(paths);
  });
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.cpxo.pickFiles();
    }
  });

  // --- upload list ---------------------------------------------------------

  const rows = new Map();

  function row(p) {
    let li = rows.get(p.path);
    if (li) return li;
    li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = p.name;
    const meta = document.createElement('span');
    meta.className = 'meta';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.appendChild(document.createElement('i'));
    li.append(name, meta, bar);
    uploads.prepend(li);
    rows.set(p.path, li);
    while (uploads.children.length > 5) {
      const last = uploads.lastElementChild;
      for (const [k, v] of rows) if (v === last) rows.delete(k);
      last.remove();
    }
    return li;
  }

  window.cpxo.on('upload:started', (p) => {
    const li = row(p);
    li.querySelector('.meta').textContent = '0%';
  });
  window.cpxo.on('upload:progress', (p) => {
    const li = row(p);
    li.querySelector('.meta').textContent = `${p.percent}%`;
    li.querySelector('.bar > i').style.width = `${p.percent}%`;
  });
  window.cpxo.on('upload:done', (p) => {
    const li = row(p);
    li.querySelector('.meta').textContent = 'copied';
    li.querySelector('.bar').remove();
    const url = document.createElement('span');
    url.className = 'url';
    url.textContent = p.url;
    url.title = 'Open link';
    url.addEventListener('click', () => window.cpxo.openExternal(p.url));
    li.appendChild(url);
  });
  window.cpxo.on('upload:error', (p) => {
    const li = row(p);
    li.querySelector('.meta').textContent = 'failed';
    const bar = li.querySelector('.bar');
    if (bar) bar.remove();
    const err = document.createElement('span');
    err.className = 'error';
    err.textContent = p.error;
    li.appendChild(err);
  });

  load().catch((err) => setStatus(saveStatus, err.message, 'err'));
})();
