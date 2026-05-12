/**
 * localScanner.js
 * Fast, synchronous local checks for obvious secrets.
 * These run inline BEFORE the user can submit - no network call.
 * Backend deep scan happens on submit.
 */
const LOCAL_PATTERNS = [
  { id: 'OPENAI_KEY', regex: /sk-[A-Za-z0-9]{20,}/, label: 'OpenAI API Key' },
  { id: 'OPENAI_PROJ', regex: /sk-proj-[A-Za-z0-9_-]{20,}/, label: 'OpenAI Project Key' },
  { id: 'AWS_KEY', regex: /AKIA[0-9A-Z]{16}/, label: 'AWS Access Key' },
  { id: 'GITHUB_TOKEN', regex: /ghp_[A-Za-z0-9]{36}/, label: 'GitHub Token' },
  { id: 'JWT', regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, label: 'JWT Token' },
  { id: 'PRIVATE_KEY', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, label: 'Private Key' },
  { id: 'PASSWORD', regex: /password\s*[=:]\s*\S+/i, label: 'Password assignment' },
  { id: 'API_KEY', regex: /api[_-]?key\s*[=:]\s*\S+/i, label: 'API Key assignment' },
  { id: 'DB_URL', regex: /(mysql|postgres|mongodb):\/\/[^:]+:[^@]+@/, label: 'Database URL' },
  { id: 'BEARER', regex: /bearer\s+[A-Za-z0-9\-._~+/]+=*/i, label: 'Bearer Token' },
  { id: 'STRIPE', regex: /sk_live_[A-Za-z0-9]{24}/, label: 'Stripe Live Key' },
];

function localScan(text) {
  const hits = [];
  for (const p of LOCAL_PATTERNS) {
    if (p.regex.test(text)) hits.push({ id: p.id, label: p.label });
  }
  return hits;
}
