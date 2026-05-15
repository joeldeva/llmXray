const { detectSecrets } = require('./secretDetector');
const { detectPII } = require('./piiDetector');
const { detectInjection } = require('./injectionDetector');
const { detectFinancial } = require('./financialDetector');
const { detectHR } = require('./hrDetector');
const { detectConfidential } = require('./confidentialDetector');
const { calculateRiskScore, getRiskLevel } = require('./riskScorer');
const { normalizeForDetection } = require('./normalizeForDetection');

/**
 * Scan a text prompt and return structured findings + risk score.
 */
function scanPrompt(text) {
  const normalizedText = normalizeForDetection(text);
  const secrets = mergeFindings(detectSecrets(text), detectSecrets(normalizedText));
  const pii = mergeFindings(detectPII(text), detectPII(normalizedText));
  const injections = mergeFindings(detectInjection(text), detectInjection(normalizedText));
  const financial = mergeFindings(detectFinancial(text), detectFinancial(normalizedText));
  const hr = mergeFindings(detectHR(text), detectHR(normalizedText));
  const confidential = mergeFindings(detectConfidential(text), detectConfidential(normalizedText));

  const allFindings = [...secrets, ...pii, ...injections, ...financial, ...hr, ...confidential];
  const riskScore = calculateRiskScore(allFindings);
  const riskLevel = getRiskLevel(riskScore);

  return {
    riskScore,
    riskLevel,
    findings: {
      secrets,
      pii,
      injections,
      financial,
      hr,
      confidential,
    },
    allFindings,
  };
}

function mergeFindings(...groups) {
  const seen = new Set();
  const merged = [];
  for (const finding of groups.flat()) {
    const key = `${finding.ruleId}:${finding.label}:${finding.severity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(finding);
  }
  return merged;
}

module.exports = { scanPrompt };
