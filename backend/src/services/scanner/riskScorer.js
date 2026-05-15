/**
 * Risk Scorer
 * Converts detector findings into a 0-100 risk score and risk level.
 */

const SEVERITY_WEIGHTS = {
  critical: 50,
  high: 30,
  medium: 15,
  low: 5,
};

function calculateRiskScore(allFindings) {
  if (!allFindings || allFindings.length === 0) return 0;
  
  let score = 0;
  for (const finding of allFindings) {
    score += SEVERITY_WEIGHTS[finding.severity] || 5;
  }

  if (allFindings.some(finding => finding.severity === 'critical')) {
    score = Math.max(score, 90);
  } else if (allFindings.some(finding => finding.severity === 'high')) {
    score = Math.max(score, 70);
  } else if (allFindings.some(finding => finding.severity === 'medium')) {
    score = Math.max(score, 40);
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
