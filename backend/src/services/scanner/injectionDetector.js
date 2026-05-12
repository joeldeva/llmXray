const PHRASES = [
  { id: 'IGNORE_INSTRUCTIONS', pattern: /ignore\s+(previous|all|prior)\s+instructions?/i, severity: 'critical', label: 'Ignore instructions override' },
  { id: 'REVEAL_SYSTEM_PROMPT', pattern: /reveal\s+(the\s+)?(system\s+prompt|instructions|prompt)/i, severity: 'critical', label: 'System prompt extraction' },
  { id: 'PRINT_SECRETS', pattern: /print\s+(out\s+)?(all\s+)?(secrets?|keys?|passwords?|credentials?)/i, severity: 'critical', label: 'Secret exfiltration via print' },
  { id: 'BYPASS_POLICY', pattern: /bypass\s+(the\s+)?(policy|filter|restriction|safety)/i, severity: 'critical', label: 'Policy bypass attempt' },
  { id: 'DEVELOPER_MODE', pattern: /act\s+as\s+(if\s+you\s+(are\s+in\s+)?)?developer\s+mode/i, severity: 'critical', label: 'Developer mode jailbreak' },
  { id: 'DAN_JAILBREAK', pattern: /\b(DAN|do\s+anything\s+now)\b/i, severity: 'critical', label: 'DAN jailbreak attempt' },
  { id: 'EXFILTRATE', pattern: /exfiltrat(e|ing|ion)/i, severity: 'critical', label: 'Data exfiltration command' },
  { id: 'OVERRIDE_SAFETY', pattern: /override\s+(safety|guardrails?|rules?|restrictions?)/i, severity: 'critical', label: 'Safety override attempt' },
  { id: 'HIDDEN_INSTRUCTIONS', pattern: /hidden\s+instructions?/i, severity: 'high', label: 'Hidden instructions injection' },
  { id: 'DISCLOSE_CONFIDENTIAL', pattern: /disclose\s+confidential/i, severity: 'high', label: 'Confidential disclosure request' },
  { id: 'FORGET_INSTRUCTIONS', pattern: /forget\s+(all\s+)?previous\s+(instructions?|context)/i, severity: 'critical', label: 'Instruction reset attempt' },
  { id: 'NEW_PERSONA', pattern: /you\s+are\s+now\s+(a\s+)?(?!helpful).{0,30}without\s+(restrictions?|limits?|safety)/i, severity: 'high', label: 'Persona injection' },
];

function detectInjection(text) {
  const findings = [];
  for (const item of PHRASES) {
    if (item.pattern.test(text)) {
      findings.push({
        ruleId: item.id,
        label: item.label,
        severity: item.severity,
      });
    }
  }
  return findings;
}

module.exports = { detectInjection };
