const express = require('express');
const router = express.Router();
const { loadPolicies, savePolicies } = require('../services/policy/policyEngine');
const { DEFAULT_POLICIES } = require('../services/policy/defaultPolicies');
const crypto = require('crypto');

// GET /api/policies
router.get('/', (req, res) => {
  res.json(loadPolicies());
});

// POST /api/policies (add new)
router.post('/', (req, res) => {
  const policies = loadPolicies();
  const newPolicy = {
    id: 'POL_CUSTOM_' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    enabled: true,
    ...req.body,
  };
  policies.push(newPolicy);
  savePolicies(policies);
  res.status(201).json(newPolicy);
});

// PUT /api/policies/:id
router.put('/:id', (req, res) => {
  const policies = loadPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  policies[idx] = { ...policies[idx], ...req.body, id: req.params.id };
  savePolicies(policies);
  res.json(policies[idx]);
});

// DELETE /api/policies/:id
router.delete('/:id', (req, res) => {
  let policies = loadPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  policies.splice(idx, 1);
  savePolicies(policies);
  res.json({ success: true });
});

// POST /api/policies/reset
router.post('/reset', (req, res) => {
  savePolicies(DEFAULT_POLICIES);
  res.json(DEFAULT_POLICIES);
});

module.exports = router;
