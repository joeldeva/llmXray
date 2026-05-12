const fs = require('fs');
const path = require('path');
const { DEFAULT_POLICIES } = require('./defaultPolicies');

const POLICIES_FILE = path.join(__dirname, '../../data/policies.json');

function loadPolicies() {
  if (!fs.existsSync(POLICIES_FILE)) {
    savePolicies(DEFAULT_POLICIES);
    return DEFAULT_POLICIES;
  }
  try {
    return JSON.parse(fs.readFileSync(POLICIES_FILE, 'utf-8'));
  } catch {
    return DEFAULT_POLICIES;
  }
}

function savePolicies(policies) {
  fs.mkdirSync(path.dirname(POLICIES_FILE), { recursive: true });
  fs.writeFileSync(POLICIES_FILE, JSON.stringify(policies, null, 2));
}

/**
 * Evaluate scanner findings against all active policies.
 * Returns the highest-priority action.
 */
function evaluatePolicies(findings) {
  const policies = loadPolicies().filter(p => p.enabled);

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
