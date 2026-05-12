const PATTERNS = [
  { id: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, severity: 'medium', label: 'Email Address' },
  { id: 'PHONE_IN', regex: /(\+91[\s-]?)?[6-9]\d{9}\b/g, severity: 'medium', label: 'Indian Phone Number' },
  { id: 'PHONE_INTL', regex: /\+[1-9]\d{6,14}\b/g, severity: 'medium', label: 'International Phone Number' },
  { id: 'AADHAAR', regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, severity: 'high', label: 'Aadhaar Number' },
  { id: 'PAN', regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, severity: 'high', label: 'PAN Card Number' },
  { id: 'PASSPORT', regex: /passport\s*(number|no\.?)?[:\s]*[A-Z][0-9]{7}/i, severity: 'high', label: 'Passport Reference' },
  { id: 'CREDIT_CARD', regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11})\b/g, severity: 'critical', label: 'Credit Card Number' },
  { id: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g, severity: 'critical', label: 'Social Security Number' },
];

function detectPII(text) {
  const findings = [];
  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      findings.push({
        ruleId: pattern.id,
        label: pattern.label,
        severity: pattern.severity,
        count: matches.length,
      });
    }
  }
  return findings;
}

module.exports = { detectPII };
