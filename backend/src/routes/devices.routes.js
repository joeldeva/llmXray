const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/adminAuth');
const { listDevices, updateDeviceStatus } = require('../services/device/deviceRegistry');
const { oneOf, validateBody } = require('../middleware/validate');

router.get('/', requirePermission('device:read'), async (req, res, next) => {
  try {
    res.json(await listDevices());
  } catch (error) {
    next(error);
  }
});

router.patch('/:tenantId/:deviceId', requirePermission('device:write'), validateBody({
  status: oneOf('status', ['ACTIVE', 'SUSPENDED', 'REVOKED']),
}), async (req, res, next) => {
  try {
    const updated = await updateDeviceStatus(req.params.tenantId, req.params.deviceId, req.body.status);
    if (!updated) return res.status(404).json({ error: 'device not found or invalid status' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
