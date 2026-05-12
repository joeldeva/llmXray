const { detectSecrets } = require('./secretDetector');
const { detectPII } = require('./piiDetector');
const { detectInjection } = require('./injectionDetector');
const { detectFinancial } = require('./financialDetector');
const { detectHR } = require('./hrDetector');
const { detectConfidential } = require('./confidentialDetector');
const { calculateRiskScore, getRiskLevel } = require('./riskScorer');

/**
 * Scan a text prompt and return structured findings + risk score.
 */
function scanPrompt(text) {
  const secrets = detectSecrets(text);
  const pii = detectPII(text);
  const injections = detectInjection(text);
  const financial = detectFinancial(text);
  const hr = detectHR(text);
  const confidential = detectConfidential(text);

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

module.exports = { scanPrompt };
