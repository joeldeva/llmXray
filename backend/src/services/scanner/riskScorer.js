/**
 * Risk Scorer
 * Converts detector findings into a 0-100 risk score and risk level.
 */

const SEVERITY_WEIGHTS = {
  critical: 40,
  high: 25,
  medium: 10,
  low: 5,
};

function calculateRiskScore(allFindings) {
  if (!allFindings || allFindings.length === 0) return 0;
  
  let score = 0;
  for (const finding of allFindings) {
    score += SEVERITY_WEIGHTS[finding.severity] || 5;
  }
  return Math.min(100, score);
}

function getRiskLevel(score) {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 85) return 'HIGH';
  return 'CRITICAL';
}

module.exports = { calculateRiskScore, getRiskLevel };
