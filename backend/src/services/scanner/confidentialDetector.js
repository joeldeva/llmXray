const PATTERNS = [
  { id: 'CONFIDENTIAL_MARK', regex: /\b(confidential|strictly\s+confidential)\b/i, severity: 'high', label: 'Confidential Mark' },
  { id: 'INTERNAL_ONLY', regex: /\binternal\s+only\b/i, severity: 'high', label: 'Internal Only Mark' },
  { id: 'NDA', regex: /\b(NDA|non-disclosure\s+agreement)\b/i, severity: 'high', label: 'NDA Reference' },
  { id: 'DO_NOT_SHARE', regex: /do\s+not\s+(share|distribute|forward|copy)/i, severity: 'high', label: 'Do Not Share Instruction' },
  { id: 'TRADE_SECRET', regex: /trade\s+secret/i, severity: 'critical', label: 'Trade Secret Reference' },
  { id: 'SOURCE_CODE', regex: /(proprietary|internal)\s+source\s+code|function\s+\w+\s*\([^)]*\)\s*\{/i, severity: 'high', label: 'Source Code / Proprietary Code' },
  { id: 'CLIENT_CONTRACT', regex: /client\s+(contract|agreement|MSA|SLA)/i, severity: 'high', label: 'Client Contract Reference' },
  { id: 'BOARD_MEETING', regex: /board\s+(meeting|minutes|resolution)/i, severity: 'critical', label: 'Board Meeting Information' },
  { id: 'ACQUISITION', regex: /\b(acquisition|M&A|merger|buyout|due\s+diligence)\b/i, severity: 'critical', label: 'Acquisition/M&A Reference' },
  { id: 'UNRELEASED_PRODUCT', regex: /unreleased\s+(product|feature|version|update)/i, severity: 'high', label: 'Unreleased Product Reference' },
];

function detectConfidential(text) {
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

module.exports = { detectConfidential };
