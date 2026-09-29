'use strict';
const jwt = require('jsonwebtoken');

/** makeAuth(jwtSecret) -> Express middleware: verifies "Authorization: Bearer <jwt>", sets req.user, else 401. */
function makeAuth(jwtSecret) {
  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    throw new TypeError('makeAuth(jwtSecret): jwtSecret must be a non-empty string');
  }
  return function auth(req, res, next) {
    const header = req.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header) : null;
    if (!match) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }
    try {
      req.user = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'] });
      return next();
    } catch (_err) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = { makeAuth };
