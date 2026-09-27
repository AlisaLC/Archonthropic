'use strict';
// Bridge for the spawn-list window (renderer/spawn.html).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spawn', {
  get: () => ipcRenderer.invoke('spawn:get'),
  save: (banned) => ipcRenderer.send('spawn:set', banned),
  close: () => ipcRenderer.send('spawn:close'),
});
