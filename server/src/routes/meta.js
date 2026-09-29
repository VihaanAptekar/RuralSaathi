'use strict';
const express = require('express');
const { CROPS, CROP_LABELS } = require('../data/cropMeta');
const C = require('../constants');

module.exports = function metaRoutes(_deps) {
  const router = express.Router();
  router.get('/', (_req, res) => {
    res.json({
      crops: CROPS,
      cropLabels: CROP_LABELS,
      incomeSourceTypes: C.INCOME_SOURCE_TYPES,
      expenseCategories: C.EXPENSE_CATEGORIES,
      lenderTypes: C.LENDER_TYPES,
      irrigationTypes: C.IRRIGATION_TYPES,
    });
  });
  return router;
};
