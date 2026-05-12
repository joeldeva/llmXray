/**
 * maskEvidence
 * Takes raw scanner findings and returns a safe, masked evidence string.
 * Never stores actual sensitive values — only descriptions and patterns.
 */
function maskEvidence(allFindings, text) {
  if (!allFindings || allFindings.length === 0) return null;

  const summaries = allFindings.map(f => {
    switch (f.ruleId) {
      case 'OPENAI_KEY': return 'Detected pattern: {OPENAI_API_KEY}';
      case 'AWS_ACCESS_KEY': return 'Detected pattern: {AWS_ACCESS_KEY_ID}';
      case 'AWS_SECRET_KEY': return 'Detected pattern: {AWS_SECRET_ACCESS_KEY}';
      case 'GITHUB_TOKEN': return 'Detected pattern: {GITHUB_PAT_TOKEN}';
      case 'JWT_TOKEN': return 'Detected pattern: {JWT_TOKEN}';
      case 'PRIVATE_KEY': return 'Detected pattern: {PRIVATE_KEY_BLOCK}';
      case 'BEARER_TOKEN': return 'Detected pattern: {BEARER_TOKEN}';
      case 'DATABASE_URL': return 'Detected pattern: {DATABASE_CONNECTION_STRING}';
      case 'PASSWORD_FIELD': return 'Detected pattern: password={REDACTED}';
      case 'API_KEY_FIELD': return 'Detected pattern: api_key={REDACTED}';
      case 'EMAIL': return `Detected ${f.count || 1} email address(es)`;
      case 'PHONE_IN': return `Detected ${f.count || 1} Indian phone number(s)`;
      case 'AADHAAR': return 'Detected Aadhaar-like 12-digit number';
      case 'PAN': return 'Detected PAN card pattern';
      case 'CREDIT_CARD': return 'Detected credit card number pattern';
      case 'SSN': return 'Detected Social Security Number pattern';
      case 'SALARY_DATA': return 'Detected employee salary data reference';
      case 'BANK_ACCOUNT': return 'Detected bank account number pattern';
      case 'TRADE_SECRET': return 'Detected: trade secret reference';
      case 'BOARD_MEETING': return 'Detected: board meeting information';
      case 'ACQUISITION': return 'Detected: M&A / acquisition reference';
      case 'BINARY_FILE': return f.label;
      case 'EXECUTABLE_FILE': return f.label;
      default: return `Detected: ${f.label || f.ruleId}`;
    }
  });

  return summaries.join(' | ');
}

module.exports = { maskEvidence };
