'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');

const { openDb } = require('./db');
const { makeAuth } = require('./middleware/auth');
const { HttpError } = require('./lib/validate');

const authRoutes = require('./routes/auth');
const metaRoutes = require('./routes/meta');
const householdsRoutes = require('./routes/households');
const villageRoutes = require('./routes/village');
const consultancyRoutes = require('./routes/consultancy');
const advisoryLogsRoutes = require('./routes/advisoryLogs');
const adminRoutes = require('./routes/admin');

/** Build the Express app (no listening). Exported separately so it can be reused in tests. */
function createApp({ db, jwtSecret, clientDist }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const deps = { db, jwtSecret };
  const requireAuth = makeAuth(jwtSecret);

  // Public: login only. Everything else under /api needs a Bearer token.
  app.use('/api/auth', authRoutes(deps));
  app.use('/api', requireAuth);
  app.use('/api/meta', metaRoutes(deps));
  app.use('/api/households', householdsRoutes(deps));
  app.use('/api/village', villageRoutes(deps));
  app.use('/api/consultancy', consultancyRoutes(deps));
  app.use('/api/advisory-logs', advisoryLogsRoutes(deps));
  app.use('/api/admin', adminRoutes(deps));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // Optional static client + SPA fallback (only when clientDist/index.html exists).
  if (typeof clientDist === 'string' && clientDist && fs.existsSync(path.join(clientDist, 'index.html'))) {
    const root = path.resolve(clientDist);
    app.use(express.static(root));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path === '/api' || req.path.startsWith('/api/')) return next();
      return res.sendFile('index.html', { root });
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

/**
 * Start the API (and optionally the built client) on 127.0.0.1.
 * Pass either an open `db` or a `dbPath`. `port: 0` lets the OS choose.
 * close() shuts down the HTTP server and closes the database.
 * @returns {Promise<{server: import('http').Server, port: number, close: () => Promise<void>}>}
 */
async function start({ port = 0, db, dbPath, jwtSecret, clientDist } = {}) {
  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    throw new TypeError('start(): jwtSecret must be a non-empty string');
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TypeError('start(): port must be an integer between 0 and 65535');
  }
  let handle = db;
  const openedHere = !handle;
  if (!handle) {
    if (typeof dbPath !== 'string' || !dbPath) throw new TypeError('start(): provide either db or dbPath');
    handle = openDb(dbPath);
  }

  const app = createApp({ db: handle, jwtSecret, clientDist });

  let server;
  try {
    server = await new Promise((resolve, reject) => {
      const s = app.listen(port, '127.0.0.1');
      s.once('listening', () => resolve(s));
      s.once('error', reject);
    });
  } catch (err) {
    if (openedHere && handle.open) handle.close();
    throw err;
  }

  let closing = null;
  function close() {
    if (!closing) {
      closing = new Promise((resolve, reject) => {
        server.close((err) => {
          let failure = err && err.code !== 'ERR_SERVER_NOT_RUNNING' ? err : null;
          try {
            if (handle.open) handle.close();
          } catch (dbErr) {
            failure = failure || dbErr;
          }
          if (failure) reject(failure);
          else resolve();
        });
        if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      });
    }
    return closing;
  }

  return { server, port: server.address().port, close };
}

module.exports = { start, createApp };

// ---- CLI (web dev mode): the only place env vars and default paths are read ------------------
if (require.main === module) {
  const port = Number(process.env.PORT || 4000);
  const jwtSecret = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ruralsaathi.sqlite');
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');

  (async () => {
    const db = openDb(dbPath);
    const empty = db.prepare('SELECT COUNT(*) AS n FROM households').get().n === 0;
    const app = await start({ port, db, jwtSecret, clientDist });
    console.log(`RuralSaathi API listening on http://127.0.0.1:${app.port}  (db: ${dbPath})`);
    if (!process.env.JWT_SECRET) console.warn('JWT_SECRET not set - using an insecure development secret.');
    if (empty) console.warn('Database is empty - run "npm run seed" (from the repo root) to load demo data.');

    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      app.close().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
