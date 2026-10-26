// Preload: a small, typed bridge between the renderer and the main process.
'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const CHANNELS = ['upload:started', 'upload:progress', 'upload:done', 'upload:error', 'progress'];

contextBridge.exposeInMainWorld('cpxo', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  testConnection: (serverUrl, token) => ipcRenderer.invoke('settings:test', { serverUrl, token }),
  uploadFiles: (paths) => ipcRenderer.invoke('upload:files', paths),
  pickFiles: () => ipcRenderer.invoke('upload:pick'),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  openLog: () => ipcRenderer.invoke('shell:openLog'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  /** File objects from a drop event do not expose .path any more; resolve it here. */
  pathForFile: (file) => webUtils.getPathForFile(file),
  on: (channel, handler) => {
    if (!CHANNELS.includes(channel)) return () => {};
    const wrapped = (_e, payload) => handler(payload);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
});
