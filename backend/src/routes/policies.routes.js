const express = require('express');
const router = express.Router();
const { loadPolicies, savePolicies } = require('../services/policy/policyEngine');
const { DEFAULT_POLICIES } = require('../services/policy/defaultPolicies');
const crypto = require('crypto');
const { requirePermission } = require('../middleware/adminAuth');

// GET /api/policies
router.get('/', requirePermission('policy:read'), async (req, res, next) => {
  try {
    res.json(await loadPolicies());
  } catch (error) {
    next(error);
  }
});

// POST /api/policies (add new)
router.post('/', requirePermission('policy:write'), async (req, res, next) => {
  try {
    const policies = await loadPolicies();
  const newPolicy = {
    id: 'POL_CUSTOM_' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    enabled: true,
    ...req.body,
  };
  policies.push(newPolicy);
  await savePolicies(policies);
  res.status(201).json(newPolicy);
  } catch (error) {
    next(error);
  }
});

// PUT /api/policies/:id
router.put('/:id', requirePermission('policy:write'), async (req, res, next) => {
  try {
    const policies = await loadPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  policies[idx] = { ...policies[idx], ...req.body, id: req.params.id };
  await savePolicies(policies);
  res.json(policies[idx]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/policies/:id
router.delete('/:id', requirePermission('policy:write'), async (req, res, next) => {
  try {
    let policies = await loadPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  policies.splice(idx, 1);
  await savePolicies(policies);
  res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/policies/reset
router.post('/reset', requirePermission('policy:write'), async (req, res, next) => {
  try {
    await savePolicies(DEFAULT_POLICIES);
    res.json(DEFAULT_POLICIES);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
