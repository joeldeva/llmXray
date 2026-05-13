const express = require('express');
const router = express.Router();
const { scanPrompt } = require('../services/scanner/scanPrompt');
const { scanFile }   = require('../services/scanner/scanFile');
const { logEvent }   = require('../services/audit/auditLogger');
const { maskEvidence } = require('../services/audit/maskEvidence');

// GET /api/extension/config
router.get('/config', (req, res) => {
  res.json({
    companyName: process.env.COMPANY_NAME || 'Enterprise Corp',
    version: '1.0.0',
    scanMode: 'active',
    allowedDomains: ['chatgpt.com', 'chat.openai.com'],
    statusMessage: 'TrustGuard DLP is active and protecting your ChatGPT usage.',
    enabledFeatures: ['prompt_scan', 'paste_scan', 'file_scan'],
  });
});

// POST /api/extension/scan-prompt
router.post('/scan-prompt', (req, res) => {
  const { prompt, userId, department, site, context } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const scanResult = scanPrompt(prompt);
  const { action, policyHits } = deriveActionFromScan(scanResult);
  const evidence = maskEvidence(scanResult.findings || [], prompt);

  let maskedPrompt = null;
  if (action === 'MASK') {
    maskedPrompt = prompt
      .replace(/sk-[A-Za-z0-9]{20,}/g, '{OPENAI_API_KEY}')
      .replace(/AKIA[0-9A-Z]{16}/g, '{AWS_KEY}')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '{EMAIL}')
      .replace(/(\+91[\s-]?)?[6-9]\d{9}\b/g, '{PHONE}');
  }

  const eventId = logEvent({
    site: site || 'chatgpt.com',
    userId: userId || 'unknown',
    department: department || 'Unknown',
    eventType: 'PROMPT_SCAN',
    riskScore: scanResult.riskScore,
    riskLevel: scanResult.riskLevel,
    decision: action,
    policyHits,
    evidence,
    url: context?.url || '',
    status: action === 'ALLOW' ? 'allowed' : action === 'BLOCK' || action === 'QUARANTINE' ? 'blocked' : 'review',
  });

  // Build findings array for extension UI
  const findings = buildFindingsForUI(scanResult.findings || []);
  const message  = buildPromptMessage(action, findings);

  res.json({
    decision: action,
    riskScore: scanResult.riskScore,
    riskLevel: scanResult.riskLevel,
    policyHits,
    message,
    findings,
    maskedPrompt,
    eventId,
  });
});

// POST /api/extension/scan-file
router.post('/scan-file', (req, res) => {
  const { file, userId, department, site } = req.body;

  if (!file || !file.name) {
    return res.status(400).json({ error: 'file metadata is required' });
  }

  // scanFile now returns { action, riskScore, riskLevel, findings, message }
  const scanResult = scanFile(file);

  // scanFile is now self-contained with its own policy engine
  const action    = scanResult.action;
  const riskScore = scanResult.riskScore;
  const riskLevel = scanResult.riskLevel;
  const findings  = buildFindingsForUI(scanResult.findings || []);
  const categories = scanResult.categories || [];

  const evidence = scanResult.summary || findings.map(f => f.label).join(' | ');

  const eventId = logEvent({
    site: site || 'chatgpt.com',
    userId: userId || 'unknown',
    department: department || 'Unknown',
    eventType: 'FILE_SCAN',
    riskScore,
    riskLevel,
    decision: action,
    policyHits: categories,
    evidence,
    fileMeta: { name: file.name, type: file.type, size: file.size },
    status: action === 'ALLOW' ? 'allowed' : action === 'BLOCK' ? 'blocked' : 'review',
  });

  res.json({
    decision: action,
    riskScore,
    riskLevel,
    policyHits: categories,
    message: scanResult.message,
    findings,
    eventId,
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map scanPrompt findings to action via priority order.
 * scanPrompt uses the old policyEngine so we re-derive here.
 */
function deriveActionFromScan(scanResult) {
  if (!scanResult || !scanResult.findings) return { action: 'ALLOW', policyHits: [] };
  const { evaluatePolicies } = require('../services/policy/policyEngine');
  try {
    return evaluatePolicies(scanResult.findings);
  } catch (e) {
    // fallback: use riskLevel
    const { riskLevel, riskScore } = scanResult;
    if (riskScore >= 80) return { action: 'BLOCK', policyHits: ['HIGH_RISK'] };
    if (riskScore >= 50) return { action: 'WARN', policyHits: ['MEDIUM_RISK'] };
    return { action: 'ALLOW', policyHits: [] };
  }
}

/**
 * Convert internal findings to simple label/value pairs for extension UI.
 */
function buildFindingsForUI(findings) {
  return (findings || []).map(f => ({
    category: f.category || f.type || 'UNKNOWN',
    label: f.label || f.description || 'Security issue',
    value: f.value || f.sample || f.evidence || null,
  }));
}

function buildPromptMessage(action, findings) {
  if (!findings.length) return 'Prompt passed TrustGuard security scan.';
  const list = findings.map(f => `• ${f.label}${f.value ? ` (${f.value})` : ''}`).join('\n');
  if (action === 'BLOCK') return `TrustGuard blocked this prompt.\n\nIssues found:\n${list}`;
  if (action === 'WARN')  return `Sensitive content detected in your prompt:\n\n${list}`;
  if (action === 'MASK')  return `Sensitive values were masked before sending:\n\n${list}`;
  return 'Prompt cleared.';
}

module.exports = router;
