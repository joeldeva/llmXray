const express = require('express');
const router = express.Router();
const { loadLogs, getStats } = require('../services/audit/auditLogger');

// GET /api/audit/logs
router.get('/logs', (req, res) => {
  const logs = loadLogs();
  res.json(logs);
});

// GET /api/audit/stats
router.get('/stats', (req, res) => {
  const stats = getStats();
  res.json(stats);
});

module.exports = router;
