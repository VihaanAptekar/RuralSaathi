'use strict';
const express = require('express');
const { seedDatabase } = require('../seed.js');

module.exports = function adminRoutes({ db }) {
  const router = express.Router();
  router.post('/reseed', (_req, res) => {
    const counts = seedDatabase(db, { force: true });
    res.json({ seeded: true, counts });
  });
  return router;
};
