'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Pin the userData location so it is %APPDATA%\RuralSaathi in every mode,
// independent of how Electron resolves the app name (package.json "name" vs
// "productName"). Must run before requestSingleInstanceLock / whenReady.
app.setPath('userData', path.join(app.getPath('appData'), 'RuralSaathi'));

let mainWindow = null;
let closeServer = null; // set once start() resolves
let shutdownPromise = null;
let readyToExit = false;

// Shared runtime context. Filled in during startup.
// PHASE 6 HOOK: IPC handlers (data location, open folder, backup) should read
// from this object rather than recomputing paths. Note `db` is exposed so a
// backup can use db.backup() (safe under WAL) instead of copying the file.
const ctx = {
  userData: null,
  dbPath: null,
  db: null,
  port: null,
  getWindow: () => mainWindow,
};

function loadOrCreateConfig(userData) {
  const configPath = path.join(userData, 'config.json');
  let config = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (parsed && typeof parsed === 'object') config = parsed;
  } catch {
    // missing or corrupt -> recreate below
  }
  if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length < 32) {
    config.jwtSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  }
  return config;
}

// close() the server (and DB, per start()'s contract) exactly once.
function shutdownServer() {
  if (!shutdownPromise) {
    shutdownPromise = (async () => {
      if (!closeServer) return;
      const fn = closeServer;
      closeServer = null;
      try {
        // Don't let a stuck connection keep RuralSaathi.exe alive.
        await Promise.race([
          Promise.resolve().then(fn),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch (err) {
        console.error('Error while closing server:', err);
      }
    })();
  }
  return shutdownPromise;
}

function quitAfterShutdown() {
  shutdownServer().finally(() => {
    readyToExit = true;
    app.quit();
  });
}

function createWindow(port) {
  const origin = `http://127.0.0.1:${port}`;

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Read by preload.js (sandboxed preloads can't require package.json).
      additionalArguments: [`--app-version=${app.getVersion()}`],
    },
  });

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    mainWindow = null;
  });

  const isInternal = (url) => {
    try {
      return new URL(url).origin === origin;
    } catch {
      return false;
    }
  };
  const blockExternalNav = (event, url) => {
    if (!isInternal(url)) event.preventDefault();
  };
  win.webContents.on('will-navigate', blockExternalNav);
  win.webContents.on('will-redirect', blockExternalNav);

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).protocol === 'https:') shell.openExternal(url);
    } catch {
      // malformed URL -> just deny
    }
    return { action: 'deny' };
  });

  return { win, origin };
}

async function startup() {
  await app.whenReady();

  let userData = app.getPath('userData');
  if (!app.isPackaged) userData = path.join(userData, 'dev');
  fs.mkdirSync(userData, { recursive: true });

  const dbPath = path.join(userData, 'ruralsaathi.sqlite');
  const { jwtSecret } = loadOrCreateConfig(userData);

  // Required lazily, after ready, so a native-module failure (e.g.
  // NODE_MODULE_VERSION) lands in the error dialog below instead of
  // crashing silently at import time.
  const { openDb } = require('../server/src/db');
  const { seedDatabase, isEmpty } = require('../server/src/seed');
  const { start } = require('../server/src/index');

  const db = openDb(dbPath);
  ctx.userData = userData;
  ctx.dbPath = dbPath;
  ctx.db = db;

  try {
    if (isEmpty(db)) seedDatabase(db);

    const clientDist = app.isPackaged
      ? path.join(app.getAppPath(), 'client', 'dist')
      : path.join(__dirname, '..', 'client', 'dist');
    const indexExists = fs.existsSync(path.join(clientDist, 'index.html'));
    console.log(`[main] clientDist=${clientDist} index.html exists=${indexExists}`);
    if (!indexExists) {
      throw new Error(
        `Client build not found at ${clientDist}. Run "npm run build:client" first.`
      );
    }

    const { port, close } = await start({ port: 0, db, jwtSecret, clientDist });
    closeServer = close;
    ctx.port = port;

    const { win, origin } = createWindow(port);
    mainWindow = win;
    await win.loadURL(origin);
  } catch (err) {
    // If start() never took ownership of the DB, don't leave it open.
    if (!closeServer) {
      try {
        db.close();
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('window-all-closed', quitAfterShutdown);

  app.on('before-quit', (event) => {
    if (readyToExit) return;
    event.preventDefault();
    quitAfterShutdown();
  });

  startup().catch((err) => {
    console.error(err);
    let message = err && err.message ? err.message : String(err);
    if (/NODE_MODULE_VERSION/.test(message)) {
      message += '\n\nHint: run "npm run rebuild:electron" and try again.';
    }
    dialog.showErrorBox('RuralSaathi could not start', message);
    app.exit(1);
  });
}
