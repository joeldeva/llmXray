const express = require('express');
const { buildUsageSummary } = require('../services/usage/usageTracker');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(buildUsageSummary(req.apiKey));
});

module.exports = router;
