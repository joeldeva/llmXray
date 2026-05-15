const express = require('express');
const multer = require('multer');
const router = express.Router();
const { scanPrompt } = require('../services/scanner/scanPrompt');
const { logEvent } = require('../services/audit/auditLogger');
const { maskEvidence } = require('../services/audit/maskEvidence');
const { addToQueue } = require('../services/review/reviewQueue');
const { requireString, validateBody } = require('../middleware/validate');
const { buildFileMeta, extractFileText, isDangerousFile } = require('../services/scanner/extractFileText');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/config', (req, res) => {
  res.json({
    companyName: process.env.COMPANY_NAME || 'Enterprise Corp',
    version: '1.0.0',
    scanMode: 'active',
    statusMessage: 'LlmXray API is active.',
    enabledFeatures: ['prompt_scan', 'file_scan'],
  });
});

router.post('/prompt', validateBody({
  prompt: requireString('prompt', { max: 200000 }),
}), async (req, res, next) => {
  try {
    const { prompt, userId, department, site, context } = req.body;
    const scanResult = scanPrompt(prompt);
    const { action, policyHits } = await deriveActionFromScan(scanResult);
    const allFindings = getAllFindings(scanResult);
    const findings = buildFindingsForResponse(allFindings);
    const evidence = maskEvidence(allFindings, prompt);

    let maskedPrompt = null;
    if (action === 'MASK') {
      maskedPrompt = prompt
        .replace(/sk-[A-Za-z0-9]{20,}/g, '{OPENAI_API_KEY}')
        .replace(/AKIA[0-9A-Z]{16}/g, '{AWS_KEY}')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '{EMAIL}')
        .replace(/(\+91[\s-]?)?[6-9]\d{9}\b/g, '{PHONE}');
    }

    const event = {
      tenantId: req.llmxrayIdentity?.tenantId || 'default',
      deviceId: req.llmxrayIdentity?.deviceId || 'unknown',
      site: site || 'api-client',
      userId: req.llmxrayIdentity?.userId || userId || 'unknown',
      department: department || 'Unknown',
      eventType: 'PROMPT_SCAN',
      riskScore: scanResult.riskScore,
      riskLevel: scanResult.riskLevel,
      decision: action,
      policyHits,
      findings: maskFindingsForAudit(findings),
      evidence,
      url: context?.url || '',
      status: action === 'ALLOW' ? 'allowed' : action === 'BLOCK' || action === 'QUARANTINE' ? 'blocked' : 'review',
    };

    const eventId = await logEvent(event);
    if (action === 'HUMAN_REVIEW' || action === 'QUARANTINE') {
      await addToQueue({ ...event, decision: action, eventId });
    }

    const message = buildPromptMessage(action, findings);

    res.json({
      decision: action,
      riskScore: scanResult.riskScore,
      riskLevel: scanResult.riskLevel,
      policyHits,
      message,
      findings,
      maskedPrompt,
      eventId,
      usage: req.usage,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/file', handleUpload, async (req, res, next) => {
  try {
    const { userId, department, site } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'file upload is required' });
    }

    const fileMeta = buildFileMeta(file);
    if (isDangerousFile(file.originalname)) {
      const findings = [{ category: 'files', label: 'Dangerous file type', value: null }];
      const eventId = await writeScanAuditEvent({
        req,
        userId,
        department,
        site,
        eventType: 'FILE_SCAN',
        riskScore: 100,
        riskLevel: 'CRITICAL',
      decision: 'BLOCK',
      policyHits: ['POL_DANGEROUS_FILE_BLOCK'],
      findings,
      evidence: 'Dangerous file type',
        fileMeta,
      });

      return res.json({
        decision: 'BLOCK',
        riskScore: 100,
        riskLevel: 'CRITICAL',
        policyHits: ['POL_DANGEROUS_FILE_BLOCK'],
        message: 'LlmXray blocked this file because the file type is dangerous.',
        findings,
        fileMeta,
        eventId,
        usage: req.usage,
      });
    }

    const text = await extractFileText(file);
    const scanResult = scanPrompt(text);
    const { action, policyHits } = await deriveActionFromScan(scanResult);
    const allFindings = getAllFindings(scanResult);
    const findings = buildFindingsForResponse(allFindings);
    const evidence = findings.map(finding => finding.label).join(' | ');

    const eventId = await writeScanAuditEvent({
      req,
      userId,
      department,
      site,
      eventType: 'FILE_SCAN',
      riskScore: scanResult.riskScore,
      riskLevel: scanResult.riskLevel,
      decision: action,
      policyHits,
      findings: maskFindingsForAudit(findings),
      evidence,
      fileMeta,
    });

    res.json({
      decision: action,
      riskScore: scanResult.riskScore,
      riskLevel: scanResult.riskLevel,
      policyHits,
      message: buildPromptMessage(action, findings),
      findings,
      fileMeta,
      eventId,
      usage: req.usage,
    });
  } catch (error) {
    next(error);
  }
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'file exceeds 10MB limit' });
    }
    return next(error);
  });
}

async function writeScanAuditEvent({ req, userId, department, site, eventType, riskScore, riskLevel, decision, policyHits, findings = [], evidence, fileMeta = null }) {
  const event = {
    tenantId: req.llmxrayIdentity?.tenantId || 'default',
    deviceId: req.llmxrayIdentity?.deviceId || 'unknown',
    site: site || 'api-client',
    userId: req.llmxrayIdentity?.userId || userId || 'unknown',
    department: department || 'Unknown',
    eventType,
    riskScore,
    riskLevel,
    decision,
    policyHits,
    findings,
    evidence,
    fileMeta,
    status: decision === 'ALLOW' ? 'allowed' : decision === 'BLOCK' || decision === 'QUARANTINE' ? 'blocked' : 'review',
  };

  const eventId = await logEvent(event);
  if (decision === 'HUMAN_REVIEW' || decision === 'QUARANTINE') {
    await addToQueue({ ...event, decision, eventId });
  }
  return eventId;
}

async function deriveActionFromScan(scanResult) {
  if (!scanResult || !scanResult.findings) return { action: 'ALLOW', policyHits: [] };
  const { evaluatePolicies } = require('../services/policy/policyEngine');
  try {
    return await evaluatePolicies(scanResult.findings);
  } catch {
    const { riskScore } = scanResult;
    if (riskScore >= 80) return { action: 'BLOCK', policyHits: ['HIGH_RISK'] };
    if (riskScore >= 50) return { action: 'WARN', policyHits: ['MEDIUM_RISK'] };
    return { action: 'ALLOW', policyHits: [] };
  }
}

function getAllFindings(scanResult) {
  if (!scanResult) return [];
  if (Array.isArray(scanResult.findings)) return scanResult.findings;
  if (scanResult.findings && typeof scanResult.findings === 'object') {
    return Object.entries(scanResult.findings)
      .flatMap(([category, findings]) => (findings || []).map(finding => ({
        category,
        ...finding,
      })))
      .filter(Boolean);
  }
  if (Array.isArray(scanResult.allFindings)) return scanResult.allFindings;
  return [];
}

function buildFindingsForResponse(findings) {
  const flatFindings = Array.isArray(findings)
    ? findings
    : findings && typeof findings === 'object'
      ? Object.values(findings).flat().filter(Boolean)
      : [];

  return flatFindings.map(finding => ({
    category: finding.category || finding.type || 'UNKNOWN',
    label: finding.label || finding.description || 'Security issue',
    value: finding.value || finding.sample || finding.evidence || null,
  }));
}

function maskFindingsForAudit(findings) {
  return findings.map(finding => ({
    category: finding.category,
    label: finding.label,
    value: finding.value ? maskFindingValue(finding.value) : null,
  }));
}

function maskFindingValue(value) {
  const stringValue = String(value);
  if (stringValue.length <= 4) return '****';
  return `${stringValue.slice(0, 2)}...${stringValue.slice(-2)}`;
}

function buildPromptMessage(action, findings) {
  if (!findings.length) return 'Prompt passed LlmXray security scan.';
  const list = findings.map(finding => `- ${finding.label}${finding.value ? ` (${finding.value})` : ''}`).join('\n');
  if (action === 'BLOCK') return `LlmXray blocked this prompt.\n\nIssues found:\n${list}`;
  if (action === 'WARN') return `Sensitive content detected in your prompt:\n\n${list}`;
  if (action === 'MASK') return `Sensitive values were masked before sending:\n\n${list}`;
  return 'Prompt cleared.';
}

module.exports = router;
