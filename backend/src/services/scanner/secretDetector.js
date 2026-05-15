const PATTERNS = [
  { id: 'OPENAI_KEY', regex: /sk-[A-Za-z0-9]{20,}/, severity: 'critical', label: 'OpenAI API Key' },
  { id: 'OPENAI_PROJ_KEY', regex: /sk-proj-[A-Za-z0-9_-]{20,}/, severity: 'critical', label: 'OpenAI Project Key' },
  { id: 'AWS_ACCESS_KEY', regex: /AKIA[0-9A-Z]{16}/, severity: 'critical', label: 'AWS Access Key ID' },
  { id: 'AWS_SECRET_KEY', regex: /aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{40}/i, severity: 'critical', label: 'AWS Secret Key' },
  { id: 'GITHUB_FINE_GRAINED_PAT', regex: /github_pat_[A-Za-z0-9_]{22,}/, severity: 'critical', label: 'GitHub PAT (Fine-grained)' },
  { id: 'GITHUB_TOKEN', regex: /ghp_[A-Za-z0-9]{36}/, severity: 'critical', label: 'GitHub PAT (Classic)' },
  { id: 'GITHUB_OAUTH', regex: /gho_[A-Za-z0-9]{36}/, severity: 'critical', label: 'GitHub OAuth Token' },
  { id: 'GITHUB_REFRESH', regex: /ghr_[A-Za-z0-9]{36}/, severity: 'critical', label: 'GitHub Refresh Token' },
  { id: 'JWT_TOKEN', regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, severity: 'high', label: 'JWT Token' },
  { id: 'PRIVATE_KEY', regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, severity: 'critical', label: 'Private Key' },
  { id: 'BEARER_TOKEN', regex: /bearer\s+[A-Za-z0-9\-._~+/]{20,}=*/i, severity: 'high', label: 'Bearer Token' },
  { id: 'DATABASE_URL', regex: /(mysql|postgres|mongodb|redis):\/\/[^:]+:[^@]+@[^\s]+/i, severity: 'critical', label: 'Database Connection String' },
  { id: 'PASSWORD_FIELD', regex: /password\s*[=:]\s*\S+/i, severity: 'high', label: 'Password in text' },
  { id: 'API_KEY_FIELD', regex: /api[_-]?key\s*[=:]\s*\S+/i, severity: 'high', label: 'API Key assignment' },
  { id: 'SECRET_FIELD', regex: /secret\s*[=:]\s*\S+/i, severity: 'high', label: 'Secret assignment' },
  { id: 'SECRET_KEY_PHRASE', regex: /secret\s+key\s+(is|=|:)\s+\S{6,}/i, severity: 'high', label: 'Secret key phrase' },
  { id: 'TOKEN_FIELD', regex: /token\s*[=:]\s*\S+/i, severity: 'medium', label: 'Token assignment' },
  { id: 'SLACK_BOT_TOKEN', regex: /xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24}/, severity: 'critical', label: 'Slack Bot Token' },
  { id: 'SLACK_USER_TOKEN', regex: /xoxp-[0-9]{10,}-[A-Za-z0-9-]+/, severity: 'critical', label: 'Slack User Token' },
  { id: 'SLACK_TOKEN', regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/, severity: 'high', label: 'Slack Token' },
  { id: 'GOOGLE_API_KEY', regex: /AIza[0-9A-Za-z\-_]{35}/, severity: 'critical', label: 'Google API Key' },
  { id: 'GOOGLE_OAUTH_TOKEN', regex: /ya29\.[0-9A-Za-z\-_]+/, severity: 'critical', label: 'Google OAuth Token' },
  { id: 'STRIPE_LIVE_KEY', regex: /sk_live_[0-9A-Za-z]{24}/, severity: 'critical', label: 'Stripe Live Key' },
  { id: 'STRIPE_TEST_KEY', regex: /sk_test_[0-9A-Za-z]{24}/, severity: 'critical', label: 'Stripe Test Key' },
  { id: 'STRIPE_RESTRICTED_KEY', regex: /rk_live_[0-9A-Za-z]{24}/, severity: 'critical', label: 'Stripe Restricted Key' },
  { id: 'SENDGRID_API_KEY', regex: /SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}/, severity: 'critical', label: 'SendGrid API Key' },
  { id: 'MAILGUN_API_KEY', regex: /key-[A-Za-z0-9]{32}/, severity: 'critical', label: 'Mailgun API Key' },
  { id: 'RAZORPAY_KEY', regex: /rzp_(live|test)_[A-Za-z0-9]{14}/, severity: 'critical', label: 'Razorpay Key' },
  { id: 'FACEBOOK_ACCESS_TOKEN', regex: /EAACEdEose0cBA[0-9A-Za-z]+/, severity: 'critical', label: 'Facebook Access Token' },
];

function detectSecrets(text) {
  const findings = [];
  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    if (regex.test(text)) {
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
