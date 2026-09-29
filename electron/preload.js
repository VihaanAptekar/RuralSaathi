'use strict';

// Sandboxed preload: only `electron` (contextBridge, ipcRenderer, ...) is
// requirable here. No fs/path/etc. Keep it that way.
const { contextBridge } = require('electron');

// main.js passes the version via webPreferences.additionalArguments.
const PREFIX = '--app-version=';
const arg = process.argv.find((a) => a.startsWith(PREFIX));
const version = arg ? arg.slice(PREFIX.length) : 'unknown';

// PHASE 6: add validated channels to this same object, e.g.
//   getDataLocation: () => ipcRenderer.invoke('data:get-location')
// Expose named functions only, never ipcRenderer itself.
contextBridge.exposeInMainWorld('ruralSaathi', { version });
