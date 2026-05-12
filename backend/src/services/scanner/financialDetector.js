const PATTERNS = [
  { id: 'BANK_ACCOUNT', regex: /\baccount\s*(number|no\.?)[:\s]*\d{9,18}/i, severity: 'high', label: 'Bank Account Number' },
  { id: 'IFSC', regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/, severity: 'high', label: 'IFSC Code' },
  { id: 'CREDIT_CARD_CONTEXT', regex: /(credit|debit)\s+card\s+(number|no\.?|details?|info)/i, severity: 'high', label: 'Credit/Debit Card Reference' },
  { id: 'SALARY_AMOUNT', regex: /salary\s*(of|is|:|=)?\s*[\u20B9$£€]?\s*[\d,]+/i, severity: 'high', label: 'Salary Figure' },
  { id: 'INVOICE', regex: /invoice\s*(no\.?|number|#)[:\s]*[A-Z0-9\-]+/i, severity: 'medium', label: 'Invoice Reference' },
  { id: 'PAYMENT_DETAILS', regex: /(payment|transfer|transaction)\s+(details?|info|confirmation)/i, severity: 'medium', label: 'Payment Details' },
  { id: 'BANK_STATEMENT', regex: /bank\s+statement/i, severity: 'high', label: 'Bank Statement Reference' },
  { id: 'FINANCIAL_FORECAST', regex: /financial\s+forecast/i, severity: 'high', label: 'Financial Forecast' },
  { id: 'REVENUE_DATA', regex: /quarterly?\s+(revenue|earnings|profit|loss)/i, severity: 'high', label: 'Revenue Data' },
  { id: 'UPI_ID', regex: /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/, severity: 'medium', label: 'UPI ID' },
];

function detectFinancial(text) {
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

module.exports = { detectFinancial };
