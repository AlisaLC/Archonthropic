'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const OUT = new Set(['shape', 'menu', 'focus', 'width', 'sys-detail']);
contextBridge.exposeInMainWorld('api', {
  onUpdate: (cb) => ipcRenderer.on('update', (_e, data) => cb(data)),
  onSys: (cb) => ipcRenderer.on('sys', (_e, data) => cb(data)),
  send: (channel, payload) => { if (OUT.has(channel)) ipcRenderer.send(channel, payload); },
});
