// Tray icon and menu.
'use strict';
const path = require('path');
const { Tray, Menu, nativeImage } = require('electron');

const ASSETS = path.join(__dirname, '..', '..', 'assets');

class AppTray {
  /**
   * @param {object} handlers
   * @param {() => void} handlers.onPaste
   * @param {() => void} handlers.onUpload
   * @param {(checked: boolean) => void} handlers.onToggleSync
   * @param {() => void} handlers.onDashboard
   * @param {() => void} handlers.onSettings
   * @param {() => void} handlers.onQuit
   */
  constructor(handlers) {
    this.handlers = handlers;
    this.state = { signedIn: false, syncClipboard: true, online: true, progress: null };
    const icon = nativeImage.createFromPath(path.join(ASSETS, 'tray.png'));
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    this.tray.on('click', () => this.tray.popUpContextMenu());
    this.tray.on('double-click', () => handlers.onSettings());
    this.render();
  }

  update(patch) {
    Object.assign(this.state, patch);
    this.render();
  }

  setProgress(progress) {
    // progress: null | { name, percent }
    this.state.progress = progress;
    this.renderTooltip();
  }

  renderTooltip() {
    const { signedIn, online, progress } = this.state;
    let tip = 'cpxo';
    if (!signedIn) tip = 'cpxo: not signed in';
    else if (!online) tip = 'cpxo: server unreachable, retrying';
    if (progress) tip = `cpxo: uploading ${progress.name} ${progress.percent}%`;
    this.tray.setToolTip(tip);
  }

  render() {
    const { signedIn, syncClipboard, online } = this.state;
    const h = this.handlers;
    const template = [];

    if (!signedIn) {
      template.push({ label: 'Not signed in', enabled: false });
      template.push({ label: 'Sign in...', click: h.onSettings });
      template.push({ type: 'separator' });
    } else if (!online) {
      template.push({ label: 'Server unreachable, retrying...', enabled: false });
      template.push({ type: 'separator' });
    }

    template.push(
      { label: 'Paste from phone now', click: h.onPaste, enabled: signedIn },
      { label: 'Upload file...', click: h.onUpload, enabled: signedIn },
      {
        label: 'Sync clipboard',
        type: 'checkbox',
        checked: !!syncClipboard,
        enabled: signedIn,
        click: (item) => h.onToggleSync(item.checked),
      },
      { type: 'separator' },
      { label: 'Open dashboard', click: h.onDashboard },
      { label: 'Settings', click: h.onSettings },
      { type: 'separator' },
      { label: 'Quit', click: h.onQuit },
    );

    this.tray.setContextMenu(Menu.buildFromTemplate(template));
    this.renderTooltip();
  }

  destroy() {
    if (this.tray) this.tray.destroy();
    this.tray = null;
  }
}

module.exports = { AppTray };
