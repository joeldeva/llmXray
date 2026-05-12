const express = require('express');
const router = express.Router();
const { loadQueue, updateQueueItem } = require('../services/review/reviewQueue');

// GET /api/review
router.get('/', (req, res) => {
  const queue = loadQueue();
  res.json(queue);
});

// POST /api/review/:id/approve
router.post('/:id/approve', (req, res) => {
  const updated = updateQueueItem(req.params.id, 'APPROVED', req.body.note);
  if (!updated) return res.status(404).json({ error: 'Review item not found' });
  res.json(updated);
});

// POST /api/review/:id/reject
router.post('/:id/reject', (req, res) => {
  const updated = updateQueueItem(req.params.id, 'REJECTED', req.body.note);
  if (!updated) return res.status(404).json({ error: 'Review item not found' });
  res.json(updated);
});

module.exports = router;
