const express = require('express');
const { buildUsageSummary } = require('../services/usage/usageTracker');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await buildUsageSummary(req.apiKey));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
