// TrustGuard Extension Config
// Shared across all content scripts
const TRUSTGUARD_CONFIG = {
  BACKEND_URL: 'http://localhost:3001',
  COMPANY_NAME: 'Enterprise Corp',
  VERSION: '1.0.0',
  // Only these domains are monitored
  PROTECTED_DOMAINS: ['chatgpt.com', 'chat.openai.com'],
  // Minimum text length to trigger a backend scan
  MIN_SCAN_LENGTH: 20,
};
