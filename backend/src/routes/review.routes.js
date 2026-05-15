const express = require('express');
const router = express.Router();
const { loadQueue, updateQueueItem } = require('../services/review/reviewQueue');
const { requirePermission } = require('../middleware/adminAuth');
const { optionalString, validateBody } = require('../middleware/validate');

// GET /api/review
router.get('/', requirePermission('review:read'), async (req, res, next) => {
  try {
    const queue = await loadQueue();
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

// POST /api/review/:id/approve
router.post('/:id/approve', requirePermission('review:write'), validateBody({
  note: optionalString('note', { max: 2000 }),
}), async (req, res, next) => {
  try {
    const updated = await updateQueueItem(req.params.id, 'APPROVED', req.body.note);
  if (!updated) return res.status(404).json({ error: 'Review item not found' });
  res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/review/:id/reject
router.post('/:id/reject', requirePermission('review:write'), validateBody({
  note: optionalString('note', { max: 2000 }),
}), async (req, res, next) => {
  try {
    const updated = await updateQueueItem(req.params.id, 'REJECTED', req.body.note);
  if (!updated) return res.status(404).json({ error: 'Review item not found' });
  res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
