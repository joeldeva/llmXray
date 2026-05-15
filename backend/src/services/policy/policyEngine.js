const { DEFAULT_POLICIES } = require('./defaultPolicies');
const { readJson, writeJson } = require('../storage/jsonStore');
const { getPool, hasPostgres, query } = require('../storage/postgres');

const POLICIES_FILE = 'policies.json';

async function loadPolicies() {
  if (hasPostgres()) {
    const result = await query('SELECT policy FROM policies ORDER BY id ASC');
    if (result.rows.length === 0) {
      await savePolicies(DEFAULT_POLICIES);
      return DEFAULT_POLICIES;
    }
    return result.rows.map(row => row.policy);
  }

  const policies = readJson(POLICIES_FILE, null);
  if (!policies) {
    await savePolicies(DEFAULT_POLICIES);
    return DEFAULT_POLICIES;
  }
  return policies;
}

async function savePolicies(policies) {
  if (hasPostgres()) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM policies');
      for (const policy of policies) {
        await client.query(
          `INSERT INTO policies (id, policy, enabled, updated_at)
           VALUES ($1, $2::jsonb, $3, NOW())`,
          [policy.id, JSON.stringify(policy), policy.enabled !== false]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  writeJson(POLICIES_FILE, policies);
}

/**
 * Evaluate scanner findings against all active policies.
 * Returns the highest-priority action.
 */
async function evaluatePolicies(findings) {
  const policies = (await loadPolicies()).filter(p => p.enabled);

  const ACTION_PRIORITY = ['QUARANTINE', 'BLOCK', 'HUMAN_REVIEW', 'MASK', 'WARN', 'ALLOW'];

  let decidedAction = 'ALLOW';
  const policyHits = [];

  for (const policy of policies) {
    let triggered = false;

    // Check category-based match
    for (const cat of policy.matchCategories) {
      const categoryFindings = findings[cat] || [];
      const filtered = categoryFindings.filter(f => {
        const sevMap = { critical: 4, high: 3, medium: 2, low: 1 };
        return sevMap[f.severity] >= sevMap[policy.minSeverity];
      });

      if (filtered.length > 0) {
        if (policy.minFindingCount && filtered.length < policy.minFindingCount) continue;
        triggered = true;
        break;
      }
    }

    // Check specific rule ID match
    if (!triggered) {
      for (const ruleId of policy.matchRuleIds) {
        const allCategoryFindings = Object.values(findings).flat();
        if (allCategoryFindings.some(f => f.ruleId === ruleId)) {
          triggered = true;
          break;
        }
      }
    }

    if (triggered) {
      policyHits.push(policy.id);
      const currentPriority = ACTION_PRIORITY.indexOf(decidedAction);
      const newPriority = ACTION_PRIORITY.indexOf(policy.action);
      if (newPriority < currentPriority) {
        decidedAction = policy.action;
      }
    }
  }

  return { action: decidedAction, policyHits };
}

module.exports = { loadPolicies, savePolicies, evaluatePolicies };
