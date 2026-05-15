const { readJson, writeJson } = require('../storage/jsonStore');

const USAGE_FILE = 'usageEvents.json';
const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 32 * ONE_DAY_MS;
const PLAN_LIMITS = {
  free: 1000,
  team: 50000,
  enterprise: null,
};

function checkAndRecordUsage(apiKey) {
  const now = Date.now();
  const keyId = apiKey.id;
  const allUsage = readJson(USAGE_FILE, {});
  const timestamps = (allUsage[keyId] || []).filter(timestamp => now - timestamp < ONE_MONTH_MS);
  const minuteWindow = timestamps.filter(timestamp => now - timestamp < ONE_MINUTE_MS);
  const dayWindow = timestamps.filter(timestamp => now - timestamp < ONE_DAY_MS);
  const monthWindow = timestamps.filter(timestamp => timestamp >= startOfCurrentMonth(now));
  const minuteLimit = Number(process.env.LLMXRAY_RATE_LIMIT_PER_MINUTE || 100);
  const dailyLimit = Number(process.env.LLMXRAY_RATE_LIMIT_PER_DAY || 10000);
  const planLimit = getPlanLimit(apiKey.plan);

  if (planLimit !== null && monthWindow.length >= planLimit) {
    return {
      allowed: false,
      statusCode: 402,
      message: 'Scan limit reached. Upgrade to Team plan at llmxray.com/pricing',
      usage: buildUsage(minuteWindow.length, dayWindow.length, dailyLimit),
    };
  }

  if (minuteWindow.length >= minuteLimit) {
    return {
      allowed: false,
      statusCode: 429,
      retryAfter: secondsUntilReset(minuteWindow[0], ONE_MINUTE_MS, now),
      usage: buildUsage(minuteWindow.length, dayWindow.length, dailyLimit),
    };
  }

  if (dayWindow.length >= dailyLimit) {
    return {
      allowed: false,
      statusCode: 429,
      retryAfter: secondsUntilReset(dayWindow[0], ONE_DAY_MS, now),
      usage: buildUsage(minuteWindow.length, dayWindow.length, dailyLimit),
    };
  }

  timestamps.push(now);
  allUsage[keyId] = timestamps;
  writeJson(USAGE_FILE, allUsage);

  return {
    allowed: true,
    usage: buildUsage(minuteWindow.length + 1, dayWindow.length + 1, dailyLimit),
  };
}

function getUsageForKey(keyId) {
  const now = Date.now();
  const timestamps = (readJson(USAGE_FILE, {})[keyId] || []).filter(timestamp => now - timestamp < ONE_MONTH_MS);
  return {
    minute: timestamps.filter(timestamp => now - timestamp < ONE_MINUTE_MS).length,
    day: timestamps.filter(timestamp => now - timestamp < ONE_DAY_MS).length,
    month: timestamps.filter(timestamp => timestamp >= startOfCurrentMonth(now)).length,
  };
}

function buildUsage(requestsThisMinute, requestsToday, dailyLimit) {
  return { requestsThisMinute, requestsToday, dailyLimit };
}

function buildUsageSummary(apiKey) {
  const usage = getUsageForKey(apiKey.id);
  const plan = normalizePlan(apiKey.plan);
  const scansLimit = getPlanLimit(plan);
  const percentUsed = scansLimit === null ? 0 : Math.min(100, Math.round((usage.month / scansLimit) * 100));

  return {
    apiKey: apiKey.maskedKey,
    org: apiKey.org,
    plan,
    scansThisMonth: usage.month,
    scansLimit: scansLimit === null ? 'unlimited' : scansLimit,
    percentUsed,
    resetDate: getResetDate(),
  };
}

function getPlanLimit(plan) {
  return PLAN_LIMITS[normalizePlan(plan)];
}

function normalizePlan(plan) {
  return Object.prototype.hasOwnProperty.call(PLAN_LIMITS, plan) ? plan : 'free';
}

function getResetDate(now = Date.now()) {
  const date = new Date(now);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString();
}

function startOfCurrentMonth(now = Date.now()) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function secondsUntilReset(oldestTimestamp, windowMs, now) {
  return Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
}

module.exports = {
  buildUsageSummary,
  checkAndRecordUsage,
  getPlanLimit,
  getUsageForKey,
  startOfCurrentMonth,
};
