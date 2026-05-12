const express = require('express');
const router = express.Router();
const { scanPrompt } = require('../services/scanner/scanPrompt');
const { scanFile } = require('../services/scanner/scanFile');
const { evaluatePolicies } = require('../services/policy/policyEngine');
const { logEvent } = require('../services/audit/auditLogger');
const { addToQueue } = require('../services/review/reviewQueue');
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
  const { action, policyHits } = evaluatePolicies(scanResult.findings);
  const evidence = maskEvidence(scanResult.allFindings, prompt);

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

  if (action === 'HUMAN_REVIEW' || action === 'QUARANTINE') {
    addToQueue({
      eventId,
      site: site || 'chatgpt.com',
      userId: userId || 'unknown',
      department: department || 'Unknown',
      eventType: 'PROMPT_SCAN',
      riskScore: scanResult.riskScore,
      riskLevel: scanResult.riskLevel,
      decision: action,
      policyHits,
      evidence,
    });
  }

  const messages = {
    ALLOW: 'Prompt cleared by TrustGuard policy.',
    WARN: `Sensitive information detected. Please review before submitting. (${policyHits.join(', ')})`,
    MASK: 'Sensitive information has been masked before submission.',
    BLOCK: `Submission blocked by TrustGuard policy: ${policyHits.join(', ')}. Do not paste API keys, credentials, or confidential data into ChatGPT.`,
    HUMAN_REVIEW: 'This prompt has been flagged for security review. A human reviewer will assess it shortly.',
    QUARANTINE: 'This prompt has been quarantined due to critical policy violation.',
  };

  res.json({
    decision: action,
    riskScore: scanResult.riskScore,
    riskLevel: scanResult.riskLevel,
    policyHits,
    message: messages[action] || 'Policy evaluated.',
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

  const scanResult = scanFile(file);
  const { action, policyHits } = evaluatePolicies(scanResult.findings);
  const evidence = maskEvidence(scanResult.allFindings, file.content || '');

  const eventId = logEvent({
    site: site || 'chatgpt.com',
    userId: userId || 'unknown',
    department: department || 'Unknown',
    eventType: 'FILE_SCAN',
    riskScore: scanResult.riskScore,
    riskLevel: scanResult.riskLevel,
    decision: action,
    policyHits,
    evidence,
    fileMeta: { name: file.name, type: file.type, size: file.size },
    status: action === 'ALLOW' ? 'allowed' : 'blocked',
  });

  if (action === 'HUMAN_REVIEW' || action === 'QUARANTINE') {
    addToQueue({
      eventId,
      site: site || 'chatgpt.com',
      userId: userId || 'unknown',
      department: department || 'Unknown',
      eventType: 'FILE_SCAN',
      riskScore: scanResult.riskScore,
      decision: action,
      policyHits,
      evidence,
      fileMeta: { name: file.name, type: file.type, size: file.size },
    });
  }

  const messages = {
    ALLOW: 'File cleared by TrustGuard policy.',
    WARN: `File may contain sensitive data. Please review: ${policyHits.join(', ')}`,
    BLOCK: `File upload blocked: ${policyHits.join(', ')}`,
    HUMAN_REVIEW: 'File sent to security review queue.',
    QUARANTINE: 'File quarantined due to critical policy violation.',
  };

  res.json({
    decision: action,
    riskScore: scanResult.riskScore,
    riskLevel: scanResult.riskLevel,
    policyHits,
    message: messages[action] || 'Policy evaluated.',
    eventId,
    deepScanRequired: scanResult.deepScanRequired || false,
  });
});

module.exports = router;
