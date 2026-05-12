const PATTERNS = [
  { id: 'OPENAI_KEY', regex: /sk-[A-Za-z0-9]{20,}/, severity: 'critical', label: 'OpenAI API Key' },
  { id: 'OPENAI_PROJ_KEY', regex: /sk-proj-[A-Za-z0-9_-]{20,}/, severity: 'critical', label: 'OpenAI Project Key' },
  { id: 'AWS_ACCESS_KEY', regex: /AKIA[0-9A-Z]{16}/, severity: 'critical', label: 'AWS Access Key ID' },
  { id: 'AWS_SECRET_KEY', regex: /aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{40}/i, severity: 'critical', label: 'AWS Secret Key' },
  { id: 'GITHUB_TOKEN', regex: /ghp_[A-Za-z0-9]{36}/, severity: 'critical', label: 'GitHub Personal Access Token' },
  { id: 'GITHUB_OAUTH', regex: /gho_[A-Za-z0-9]{36}/, severity: 'critical', label: 'GitHub OAuth Token' },
  { id: 'JWT_TOKEN', regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, severity: 'high', label: 'JWT Token' },
  { id: 'PRIVATE_KEY', regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, severity: 'critical', label: 'Private Key' },
  { id: 'BEARER_TOKEN', regex: /bearer\s+[A-Za-z0-9\-._~+/]+=*/i, severity: 'high', label: 'Bearer Token' },
  { id: 'DATABASE_URL', regex: /(mysql|postgres|mongodb|redis):\/\/[^:]+:[^@]+@[^\s]+/i, severity: 'critical', label: 'Database Connection String' },
  { id: 'PASSWORD_FIELD', regex: /password\s*[=:]\s*\S+/i, severity: 'high', label: 'Password in text' },
  { id: 'API_KEY_FIELD', regex: /api[_-]?key\s*[=:]\s*\S+/i, severity: 'high', label: 'API Key assignment' },
  { id: 'SECRET_FIELD', regex: /secret\s*[=:]\s*\S+/i, severity: 'high', label: 'Secret assignment' },
  { id: 'TOKEN_FIELD', regex: /token\s*[=:]\s*\S+/i, severity: 'medium', label: 'Token assignment' },
  { id: 'STRIPE_KEY', regex: /sk_live_[A-Za-z0-9]{24}/, severity: 'critical', label: 'Stripe Live Secret Key' },
  { id: 'SLACK_TOKEN', regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/, severity: 'high', label: 'Slack Token' },
];

function detectSecrets(text) {
  const findings = [];
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(text)) {
      findings.push({
        ruleId: pattern.id,
        label: pattern.label,
        severity: pattern.severity,
      });
    }
  }
  return findings;
}

module.exports = { detectSecrets };
