const express = require('express');
const router = express.Router();
const { queryAuditLogs, getStats, verifyAuditChain } = require('../services/audit/auditLogger');

// GET /api/audit/logs
router.get('/logs', async (req, res, next) => {
  try {
    res.json(await queryAuditLogs(req.query));
  } catch (error) {
    next(error);
  }
});

// GET /api/audit/stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/audit/verify
router.get('/verify', async (req, res, next) => {
  try {
    const result = await verifyAuditChain();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
