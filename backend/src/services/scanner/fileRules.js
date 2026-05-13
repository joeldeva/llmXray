/**
 * fileRules.js
 * Complete rule database for TrustGuard file scanning.
 * Covers all 18 threat categories with precise patterns and policies.
 */

// ─── DANGEROUS FILENAMES (block regardless of content) ───────────────────────
const BLOCKED_FILENAMES = [
  '.env', '.env.local', '.env.production', '.env.staging', '.env.development',
  'credentials.json', 'service-account.json', 'firebase-adminsdk.json',
  'google-services.json', 'aws_credentials', 'aws-credentials',
  'id_rsa', 'id_ed25519', 'id_dsa', 'id_ecdsa',
  'private_key.pem', 'terraform.tfstate', 'kubeconfig',
  'secrets.yaml', 'secrets.yml', 'docker-compose.yml', 'docker-compose.yaml',
  '.git-credentials', '.netrc', '.npmrc', '.pypirc',
  'database_dump.sql', 'prod_dump.sql', 'backup.sql',
  'customers.csv', 'users.csv', 'employees.xlsx', 'salary.xlsx', 'salary_sheet.xlsx',
  'payments.csv', 'leads.csv', 'bank_statement.pdf', 'payroll.xlsx',
  'source_code.zip', 'database_backup.zip', 'kubeconfig',
  'variables.tfvars', 'main.tf', '.terraform',
];

// Pattern: if filename matches these regexes → block
const BLOCKED_FILENAME_PATTERNS = [
  { regex: /\.env(\.|$)/i,          category: 'SECRET_DETECTED',      label: 'Environment file' },
  { regex: /\.pem$/i,               category: 'PRIVATE_KEY_DETECTED', label: 'PEM private key file' },
  { regex: /\.key$/i,               category: 'PRIVATE_KEY_DETECTED', label: 'Key file' },
  { regex: /\.p12$/i,               category: 'PRIVATE_KEY_DETECTED', label: 'PKCS#12 certificate' },
  { regex: /\.pfx$/i,               category: 'PRIVATE_KEY_DETECTED', label: 'PFX certificate' },
  { regex: /\.p8$/i,                category: 'PRIVATE_KEY_DETECTED', label: 'P8 private key' },
  { regex: /\.ppk$/i,               category: 'PRIVATE_KEY_DETECTED', label: 'PuTTY private key' },
  { regex: /id_rsa/i,               category: 'PRIVATE_KEY_DETECTED', label: 'SSH private key (RSA)' },
  { regex: /id_ed25519/i,           category: 'PRIVATE_KEY_DETECTED', label: 'SSH private key (Ed25519)' },
  { regex: /\.tfstate$/i,           category: 'CLOUD_INFRA_DETECTED', label: 'Terraform state file' },
  { regex: /\.tfvars$/i,            category: 'CLOUD_INFRA_DETECTED', label: 'Terraform variables file' },
  { regex: /kubeconfig/i,           category: 'CLOUD_INFRA_DETECTED', label: 'Kubernetes config file' },
  { regex: /salary/i,               category: 'HR_CONFIDENTIAL_DETECTED', label: 'Salary data file' },
  { regex: /payroll/i,              category: 'HR_CONFIDENTIAL_DETECTED', label: 'Payroll data file' },
  { regex: /bank.?statement/i,      category: 'FINANCIAL_DATA_DETECTED', label: 'Bank statement file' },
  { regex: /(prod|production).*dump/i, category: 'DATABASE_EXPORT_DETECTED', label: 'Production DB dump' },
  { regex: /service.?account/i,     category: 'SECRET_DETECTED',      label: 'Service account file' },
  { regex: /firebase.?admin/i,      category: 'SECRET_DETECTED',      label: 'Firebase admin config' },
];

// ─── WARN-LEVEL FILENAME PATTERNS ──────────────────────────────────────────
const WARN_FILENAME_PATTERNS = [
  { regex: /\.log$/i,               category: 'LOG_FILE_SECRET_DETECTED', label: 'Log file' },
  { regex: /\.sql$/i,               category: 'DATABASE_EXPORT_DETECTED', label: 'SQL file' },
  { regex: /\.sqlite$/i,            category: 'DATABASE_EXPORT_DETECTED', label: 'SQLite database' },
  { regex: /\.db$/i,                category: 'DATABASE_EXPORT_DETECTED', label: 'Database file' },
  { regex: /\.(sh|bat|ps1)$/i,     category: 'SOURCE_CODE_DETECTED',  label: 'Script file' },
  { regex: /\.(ipynb)$/i,          category: 'SOURCE_CODE_DETECTED',  label: 'Jupyter Notebook' },
  { regex: /docker-?compose/i,     category: 'CLOUD_INFRA_DETECTED',  label: 'Docker Compose file' },
  { regex: /\.(zip|rar|7z|tar|gz)$/i, category: 'ARCHIVE_FILE_RISK', label: 'Archive/compressed file' },
  { regex: /config\.(json|yml|yaml|py|xml|properties)$/i, category: 'CONFIG_FILE_DETECTED', label: 'Configuration file' },
];

// ─── FILE EXTENSION CLASSIFICATIONS ─────────────────────────────────────────
const SOURCE_CODE_EXTENSIONS = ['.js','.ts','.jsx','.tsx','.py','.java','.kt','.cs','.php','.go','.rs','.c','.cpp','.rb','.swift'];
const CONFIG_EXTENSIONS      = ['.yml','.yaml','.json','.xml','.toml','.ini','.properties','.conf','.config'];
const DB_EXPORT_EXTENSIONS   = ['.sql','.dump','.db','.sqlite','.bak','.backup','.parquet','.avro'];
const LOG_EXTENSIONS         = ['.log'];
const ARCHIVE_EXTENSIONS     = ['.zip','.rar','.7z','.tar','.gz','.tgz'];
const DOCUMENT_EXTENSIONS    = ['.pdf','.docx','.doc','.xlsx','.xls','.pptx','.ppt','.txt','.md','.rtf','.odt','.csv'];
const MEDIA_EXTENSIONS       = ['.png','.jpg','.jpeg','.gif','.bmp','.webp','.mp4','.mp3','.wav','.mov','.avi'];

// ─── CONTENT PATTERNS ────────────────────────────────────────────────────────
const CONTENT_PATTERNS = {
  // 1. Secret/Credential patterns → BLOCK
  API_KEY_DETECTED: [
    { regex: /OPENAI_API_KEY\s*=\s*\S+/i, label: 'OpenAI API Key assignment' },
    { regex: /GEMINI_API_KEY\s*=\s*\S+/i, label: 'Gemini API Key assignment' },
    { regex: /ANTHROPIC_API_KEY\s*=\s*\S+/i, label: 'Anthropic API Key assignment' },
    { regex: /STRIPE_SECRET_KEY\s*=\s*\S+/i, label: 'Stripe Secret Key assignment' },
    { regex: /RAZORPAY_KEY_SECRET\s*=\s*\S+/i, label: 'Razorpay Key assignment' },
    { regex: /API[_\-]?KEY\s*[=:]\s*\S+/i, label: 'API Key assignment' },
    { regex: /SECRET[_\-]?KEY\s*[=:]\s*\S+/i, label: 'Secret Key assignment' },
    { regex: /CLIENT[_\-]?SECRET\s*[=:]\s*\S+/i, label: 'Client Secret assignment' },
    { regex: /FIREBASE[_\-]?PRIVATE[_\-]?KEY\s*[=:]\s*\S+/i, label: 'Firebase Private Key' },
    { regex: /GITHUB[_\-]?TOKEN\s*[=:]\s*\S+/i, label: 'GitHub Token assignment' },
  ],
  TOKEN_DETECTED: [
    { regex: /ACCESS[_\-]?TOKEN\s*[=:]\s*\S+/i, label: 'Access Token' },
    { regex: /REFRESH[_\-]?TOKEN\s*[=:]\s*\S+/i, label: 'Refresh Token' },
    { regex: /AUTH[_\-]?TOKEN\s*[=:]\s*\S+/i, label: 'Auth Token' },
    { regex: /BEARER[_\-]?TOKEN\s*[=:]\s*\S+/i, label: 'Bearer Token' },
    { regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i, label: 'Bearer token in header' },
    { regex: /Authorization:\s*Bearer\s+\S+/i, label: 'Authorization Bearer header' },
  ],
  SECRET_DETECTED: [
    { regex: /sk-[A-Za-z0-9]{20,}/,             label: 'OpenAI API key (sk-)' },
    { regex: /sk-proj-[A-Za-z0-9_-]{20,}/,      label: 'OpenAI Project key' },
    { regex: /ghp_[A-Za-z0-9]{36}/,             label: 'GitHub Personal Access Token' },
    { regex: /github_pat_[A-Za-z0-9_]{59}/,     label: 'GitHub Fine-grained PAT' },
    { regex: /AKIA[0-9A-Z]{16}/,                label: 'AWS Access Key ID' },
    { regex: /AIza[0-9A-Za-z_-]{35}/,           label: 'Google API Key' },
    { regex: /xoxb-[0-9A-Za-z-]+/,             label: 'Slack Bot Token' },
    { regex: /xoxp-[0-9A-Za-z-]+/,             label: 'Slack User Token' },
    { regex: /sk_live_[A-Za-z0-9]{24}/,         label: 'Stripe Live Secret Key' },
    { regex: /rk_live_[A-Za-z0-9]{24}/,         label: 'Stripe Live Restricted Key' },
  ],
  PRIVATE_KEY_DETECTED: [
    { regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, label: 'PEM Private Key block' },
    { regex: /-----BEGIN CERTIFICATE-----/, label: 'Certificate block' },
    { regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, label: 'JWT token' },
  ],
  DATABASE_URL_DETECTED: [
    { regex: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/i, label: 'MongoDB connection string' },
    { regex: /postgres(ql)?:\/\/[^:]+:[^@]+@/i,   label: 'PostgreSQL connection URL' },
    { regex: /mysql:\/\/[^:]+:[^@]+@/i,            label: 'MySQL connection URL' },
    { regex: /redis:\/\/:[^@]+@/i,                 label: 'Redis connection URL' },
    { regex: /DATABASE_URL\s*=\s*\S+/i,            label: 'DATABASE_URL variable' },
    { regex: /MONGO_URI\s*=\s*\S+/i,              label: 'MONGO_URI variable' },
    { regex: /POSTGRES_URL\s*=\s*\S+/i,           label: 'POSTGRES_URL variable' },
    { regex: /MYSQL_PASSWORD\s*=\s*\S+/i,         label: 'MYSQL_PASSWORD variable' },
  ],
  PASSWORD_DETECTED: [
    { regex: /password\s*[=:]\s*\S+/i,     label: 'Password assignment' },
    { regex: /passwd\s*[=:]\s*\S+/i,       label: 'Passwd assignment' },
    { regex: /MYSQL_ROOT_PASSWORD\s*=\s*\S+/i, label: 'MySQL root password' },
    { regex: /DB_PASSWORD\s*=\s*\S+/i,    label: 'DB password variable' },
    { regex: /Set-Cookie:\s*session/i,    label: 'Session cookie in log' },
  ],
  AWS_DETECTED: [
    { regex: /AWS_ACCESS_KEY_ID\s*=\s*\S+/i,     label: 'AWS Access Key ID variable' },
    { regex: /AWS_SECRET_ACCESS_KEY\s*=\s*\S+/i, label: 'AWS Secret Access Key variable' },
    { regex: /AWS_SESSION_TOKEN\s*=\s*\S+/i,     label: 'AWS Session Token' },
  ],

  // 2. PII patterns
  PII_DETECTED: [
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, label: 'Email address' },
    { regex: /\b(\+91[\-\s]?)?[6-9]\d{9}\b/g,    label: 'Indian phone number' },
    { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, label: 'Aadhaar-like number' },
    { regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/,     label: 'PAN card number' },
    { regex: /\b\d{3}-\d{2}-\d{4}\b/,            label: 'SSN (US)' },
    { regex: /\b4[0-9]{12}(?:[0-9]{3})?\b/,       label: 'Visa credit card' },
    { regex: /\b5[1-5][0-9]{14}\b/,               label: 'Mastercard number' },
    { regex: /\b3[47][0-9]{13}\b/,               label: 'Amex card number' },
  ],

  // 3. Financial patterns
  FINANCIAL_DATA_DETECTED: [
    { regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/,  label: 'IFSC code' },
    { regex: /\bIBAN\b/i,                  label: 'IBAN reference' },
    { regex: /\b\d{8,18}\b.*account/i,    label: 'Bank account number pattern' },
    { regex: /salary|payroll|compensation|ctc|gross\s*pay/i, label: 'Salary/payroll reference' },
    { regex: /gst[_\s]?number|gstin/i,    label: 'GSTIN/GST number' },
    { regex: /upi[_@]/i,                  label: 'UPI ID' },
    { regex: /razorpay|stripe\s*key/i,    label: 'Payment gateway reference' },
  ],

  // 4. HR patterns
  HR_CONFIDENTIAL_DETECTED: [
    { regex: /performance\s+appraisal|appraisal\s+report/i, label: 'Performance appraisal document' },
    { regex: /termination\s+letter|notice\s+of\s+termination/i, label: 'Termination letter' },
    { regex: /offer\s+letter|employment\s+offer/i, label: 'Offer letter' },
    { regex: /medical\s+leave|sick\s+leave|health\s+condition/i, label: 'Medical/health data' },
    { regex: /background\s+check|criminal\s+record/i, label: 'Background check data' },
    { regex: /complaint\s+report|harassment|grievance/i, label: 'HR complaint/grievance' },
  ],

  // 5. Legal patterns
  LEGAL_DOCUMENT_DETECTED: [
    { regex: /non[\s-]?disclosure\s+agreement|NDA\b/i, label: 'NDA reference' },
    { regex: /master\s+service\s+agreement|MSA\b/i,    label: 'MSA reference' },
    { regex: /statement\s+of\s+work|SOW\b/i,           label: 'SOW reference' },
    { regex: /confidential.*terms|proprietary.*clause/i, label: 'Confidential legal clause' },
    { regex: /patent|intellectual\s+property/i,        label: 'IP/Patent reference' },
    { regex: /acquisition|merger\s+agreement/i,        label: 'M&A document' },
    { regex: /board\s+resolution/i,                    label: 'Board resolution' },
  ],

  // 6. Internal strategy patterns
  INTERNAL_STRATEGY_DETECTED: [
    { regex: /fundraising\s+deck|investor\s+pitch|series\s+[A-C]\s+round/i, label: 'Fundraising/investor material' },
    { regex: /acquisition\s+target|company\s+acquisition/i, label: 'Acquisition plan' },
    { regex: /go[\s-]to[\s-]market|gtm\s+strategy/i,       label: 'GTM strategy' },
    { regex: /product\s+roadmap|feature\s+pipeline/i,       label: 'Product roadmap' },
    { regex: /sales\s+pipeline|revenue\s+forecast/i,        label: 'Sales pipeline/forecast' },
    { regex: /layoff\s+plan|workforce\s+reduction/i,        label: 'Layoff/restructuring plan' },
    { regex: /competitor\s+analysis|competitive\s+intel/i,  label: 'Competitive intelligence' },
    { regex: /board\s+meeting\s+notes|board\s+minutes/i,   label: 'Board meeting notes' },
  ],

  // 7. Cloud/infra patterns
  CLOUD_INFRA_DETECTED: [
    { regex: /apiVersion:\s*v\d/,                   label: 'Kubernetes manifest' },
    { regex: /kind:\s*(Deployment|Secret|Service|ConfigMap)/i, label: 'Kubernetes resource' },
    { regex: /terraform\s+{|resource\s+"aws_/i,     label: 'Terraform configuration' },
    { regex: /FROM\s+\w+.*\nRUN\s+/i,              label: 'Dockerfile content' },
    { regex: /github\.com\/repos|GITHUB_ACTIONS/i, label: 'GitHub Actions/CI config' },
  ],

  // 8. Log file patterns
  LOG_FILE_SECRET_DETECTED: [
    { regex: /Authorization:\s*Bearer\s+\S+/i, label: 'Bearer token in log' },
    { regex: /Set-Cookie:.*session/i,           label: 'Session cookie in log' },
    { regex: /password=\S+/i,                  label: 'Password in log' },
    { regex: /token=\S+/i,                     label: 'Token in log' },
    { regex: /\bsession_?id\s*[:=]\s*\S+/i,   label: 'Session ID in log' },
  ],

  // 9. Prompt injection
  PROMPT_INJECTION_DETECTED: [
    { regex: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, label: 'Instruction override attempt' },
    { regex: /disregard\s+(all\s+)?(previous|prior|above)/i,             label: 'Context manipulation' },
    { regex: /you\s+are\s+now\s+(?!a\s+helpful)/i,                      label: 'Persona override' },
    { regex: /\bDAN\b|\bDo\s+Anything\s+Now\b/i,                        label: 'DAN jailbreak pattern' },
    { regex: /pretend\s+(you\s+)?(are|have\s+no|do\s+not\s+have)/i,    label: 'Persona manipulation' },
    { regex: /system\s+prompt[:]/i,                                      label: 'System prompt injection' },
    { regex: /\<\|im_start\|\>|\<\|im_end\|\>/,                         label: 'Token injection attempt' },
    { regex: /jailbreak|bypass\s+(safety|filter|restriction)/i,         label: 'Jailbreak attempt' },
  ],
};

// ─── POLICY DECISION ENGINE ──────────────────────────────────────────────────

/**
 * Determine action for a given set of detected categories.
 * Returns: { action, riskScore, riskLevel }
 */
function decidePolicyForFindings(findings) {
  const categories = findings.map(f => f.category);
  const has = (...cats) => cats.some(c => categories.includes(c));

  // BLOCK: Immediate hard block, no human needed
  if (has(
    'SECRET_DETECTED', 'API_KEY_DETECTED', 'PRIVATE_KEY_DETECTED',
    'DATABASE_URL_DETECTED', 'TOKEN_DETECTED', 'AWS_DETECTED',
    'PASSWORD_DETECTED', 'PROMPT_INJECTION_DETECTED'
  )) return { action: 'BLOCK', riskScore: 99, riskLevel: 'CRITICAL' };

  // BLOCK: Bulk PII
  const piiCount = findings.filter(f => f.category === 'PII_DETECTED').length;
  if (piiCount >= 3) return { action: 'BLOCK', riskScore: 90, riskLevel: 'CRITICAL' };

  // BLOCK: Source code WITH secrets (already covered above)
  // BLOCK: Database export or Customer data
  if (has('DATABASE_EXPORT_DETECTED', 'CUSTOMER_DATA_DETECTED')) {
    return { action: 'BLOCK', riskScore: 85, riskLevel: 'CRITICAL' };
  }

  // BLOCK: Cloud infra secrets
  if (has('CLOUD_INFRA_DETECTED')) {
    return { action: 'BLOCK', riskScore: 88, riskLevel: 'CRITICAL' };
  }

  // BLOCK: Financial hard data
  if (has('FINANCIAL_DATA_DETECTED')) {
    return { action: 'BLOCK', riskScore: 80, riskLevel: 'HIGH' };
  }

  // BLOCK: Log file with secrets
  if (has('LOG_FILE_SECRET_DETECTED')) {
    return { action: 'BLOCK', riskScore: 80, riskLevel: 'HIGH' };
  }

  // BLOCK: Internal strategy (board/investor)
  if (has('INTERNAL_STRATEGY_DETECTED')) {
    return { action: 'BLOCK', riskScore: 78, riskLevel: 'HIGH' };
  }

  // BLOCK: HR salary/medical
  if (has('HR_CONFIDENTIAL_DETECTED')) {
    return { action: 'BLOCK', riskScore: 75, riskLevel: 'HIGH' };
  }

  // BLOCK: Legal contracts
  if (has('LEGAL_DOCUMENT_DETECTED')) {
    return { action: 'BLOCK', riskScore: 72, riskLevel: 'HIGH' };
  }

  // BLOCK: Archive files
  if (has('ARCHIVE_FILE_RISK')) {
    return { action: 'BLOCK', riskScore: 70, riskLevel: 'HIGH' };
  }

  // WARN: Single PII item
  if (has('PII_DETECTED')) {
    return { action: 'WARN', riskScore: 50, riskLevel: 'MEDIUM' };
  }

  // WARN: Source code without secrets
  if (has('SOURCE_CODE_DETECTED', 'CONFIG_FILE_DETECTED')) {
    return { action: 'WARN', riskScore: 40, riskLevel: 'MEDIUM' };
  }

  // WARN: Log file without obvious secrets
  if (has('LOG_FILE_SECRET_DETECTED')) {
    return { action: 'WARN', riskScore: 40, riskLevel: 'MEDIUM' };
  }

  return { action: 'ALLOW', riskScore: 5, riskLevel: 'LOW' };
}

module.exports = {
  BLOCKED_FILENAMES,
  BLOCKED_FILENAME_PATTERNS,
  WARN_FILENAME_PATTERNS,
  SOURCE_CODE_EXTENSIONS,
  CONFIG_EXTENSIONS,
  DB_EXPORT_EXTENSIONS,
  LOG_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  MEDIA_EXTENSIONS,
  CONTENT_PATTERNS,
  decidePolicyForFindings,
};
