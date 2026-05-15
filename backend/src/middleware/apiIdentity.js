const { getDevice, recordDeviceSeen } = require('../services/device/deviceRegistry');

async function bindApiIdentity(req, res, next) {
  try {
    const tenantId = req.get('x-llmxray-tenant-id') || process.env.LLMXRAY_TENANT_ID || req.apiKey?.org || 'default';
    const deviceId = req.get('x-llmxray-client-id') || req.body?.clientId || req.apiKey?.id || 'public-api-client';
    const userId = req.get('x-llmxray-subject-id') || req.body?.userId || req.apiKey?.email || 'unknown';
    const clientVersion = req.get('x-llmxray-client-version') || null;

    const existing = await getDevice(tenantId, deviceId);
    if (process.env.LLMXRAY_ENFORCE_DEVICE_REGISTRY === 'true') {
      if (!existing) return res.status(403).json({ error: 'client is not registered' });
      if (existing.status !== 'ACTIVE') return res.status(403).json({ error: 'client is not active' });
    } else if (existing && existing.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'client is not active' });
    }

    const device = await recordDeviceSeen({
      tenantId,
      deviceId,
      userId,
      clientVersion,
      userAgent: req.get('user-agent') || null,
      status: existing?.status || 'ACTIVE',
    });

    req.llmxrayIdentity = {
      tenantId,
      deviceId,
      userId,
      clientVersion,
      deviceStatus: device.status,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { bindApiIdentity };
