'use strict';
const express = require('express');
const jwt = require('jsonwebtoken');

// Single demo user. Body is ignored ({}), per the API contract.
module.exports = function authRoutes({ jwtSecret }) {
  const router = express.Router();
  router.post('/login', (_req, res) => {
    const user = { role: 'admin', name: 'Village Operator / Admin' };
    const token = jwt.sign({ sub: 'demo', ...user }, jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });
    res.json({ token, ...user });
  });
  return router;
};
