const PATTERNS = [
  { id: 'SALARY_DATA', regex: /(employee|staff)\s+salary|(salary|compensation)\s+(sheet|data|record|report)/i, severity: 'high', label: 'Employee Salary Data' },
  { id: 'RESIGNATION', regex: /\b(resignation|resign(ing)?|notice\s+period)\b/i, severity: 'medium', label: 'Resignation Reference' },
  { id: 'MEDICAL_LEAVE', regex: /(medical|sick)\s+(leave|certificate)/i, severity: 'high', label: 'Medical Leave Information' },
  { id: 'PERFORMANCE_REVIEW', regex: /performance\s+(review|appraisal|evaluation|rating)/i, severity: 'medium', label: 'Performance Review Data' },
  { id: 'OFFER_LETTER', regex: /offer\s+letter/i, severity: 'high', label: 'Offer Letter Content' },
  { id: 'APPRAISAL', regex: /\bappraisal\b/i, severity: 'medium', label: 'Appraisal Data' },
  { id: 'EMPLOYEE_RECORD', regex: /employee\s+(record|file|data|id|code)/i, severity: 'high', label: 'Employee Record' },
  { id: 'HR_CONFIDENTIAL', regex: /hr\s+confidential|confidential\s+hr/i, severity: 'critical', label: 'HR Confidential Mark' },
  { id: 'TERMINATION', regex: /\b(termination|terminated|dismissal|fired)\b/i, severity: 'high', label: 'Termination Record' },
];

function detectHR(text) {
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

module.exports = { detectHR };
