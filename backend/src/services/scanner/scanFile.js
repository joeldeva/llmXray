/**
 * scanFile.js  — LlmXray File Scanner (Production Grade)
 *
 * Analyzes file metadata + content for 18 threat categories.
 * Returns a structured decision WITH a list of exactly what was found
 * (so the employee sees "We found: OpenAI API key, 3 email addresses").
 */

const path = require('path');
const {
  BLOCKED_FILENAMES,
  BLOCKED_FILENAME_PATTERNS,
  WARN_FILENAME_PATTERNS,
  SOURCE_CODE_EXTENSIONS,
  CONFIG_EXTENSIONS,
  DB_EXPORT_EXTENSIONS,
  LOG_EXTENSIONS,
  ARCHIVE_EXTENSIONS,
  CONTENT_PATTERNS,
  decidePolicyForFindings,
} = require('./fileRules');

const MAX_CONTENT_SCAN_BYTES = 1024 * 1024; // 1MB

/**
 * Main entry point.
 * @param {Object} fileObj  - { name, type, size, content? }
 * @returns {Object}        - { action, riskScore, riskLevel, findings, message, summary }
 */
function scanFile(fileObj) {
  const findings = [];
  const name = (fileObj.name || '').toLowerCase();
  const ext  = path.extname(name).toLowerCase();
  const content = typeof fileObj.content === 'string'
    ? fileObj.content.slice(0, MAX_CONTENT_SCAN_BYTES)
    : '';

  // ── STEP 1: Hard-blocked filenames ──────────────────────────────────────
  if (BLOCKED_FILENAMES.includes(name)) {
    findings.push({ category: 'SECRET_DETECTED', label: `Dangerous filename: ${fileObj.name}`, value: fileObj.name });
  }

  // ── STEP 2: Filename pattern matching ────────────────────────────────────
  for (const rule of BLOCKED_FILENAME_PATTERNS) {
    if (rule.regex.test(fileObj.name || '')) {
      findings.push({ category: rule.category, label: rule.label, value: fileObj.name });
      break;
    }
  }

  // ── STEP 3: Warn-level filename patterns ─────────────────────────────────
  for (const rule of WARN_FILENAME_PATTERNS) {
    if (rule.regex.test(fileObj.name || '')) {
      findings.push({ category: rule.category, label: rule.label, value: fileObj.name });
    }
  }

  // STEP 4: filename suffix classification
  if (SOURCE_CODE_EXTENSIONS.includes(ext)) {
    findings.push({ category: 'SOURCE_CODE_DETECTED', label: `Source code file (${ext})`, value: ext });
  }
  if (CONFIG_EXTENSIONS.includes(ext) && !findings.some(f => f.category === 'CONFIG_FILE_DETECTED')) {
    findings.push({ category: 'CONFIG_FILE_DETECTED', label: `Configuration file (${ext})`, value: ext });
  }
  if (DB_EXPORT_EXTENSIONS.includes(ext)) {
    findings.push({ category: 'DATABASE_EXPORT_DETECTED', label: `Database export file (${ext})`, value: ext });
  }
  if (LOG_EXTENSIONS.includes(ext)) {
    findings.push({ category: 'LOG_FILE_SECRET_DETECTED', label: `Log file`, value: ext });
  }
  if (ARCHIVE_EXTENSIONS.includes(ext)) {
    findings.push({ category: 'ARCHIVE_FILE_RISK', label: `Compressed archive (${ext}) — contents unknown`, value: ext });
  }

  // ── STEP 5: Content scanning ─────────────────────────────────────────────
  if (content) {
    for (const [category, patterns] of Object.entries(CONTENT_PATTERNS)) {
      for (const p of patterns) {
        // Use global flag to find all matches for PII counting
        const regex = new RegExp(p.regex.source, p.regex.flags.includes('g') ? p.regex.flags : p.regex.flags + 'g');
        const matches = content.match(regex);
        if (matches) {
          const sample = redactSample(matches[0]);
          findings.push({
            category,
            label: p.label,
            value: sample,
            count: matches.length,
          });
          break; // One match per pattern group per category is enough
        }
      }
    }
  }

  // ── STEP 6: Bulk PII check ───────────────────────────────────────────────
  if (content) {
    const emailCount = (content.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g) || []).length;
    if (emailCount > 10) {
      findings.push({ category: 'BULK_PII_DETECTED', label: `Bulk email list (${emailCount} emails)`, value: `${emailCount} emails`, count: emailCount });
    }
    const phoneCount = (content.match(/(\+91[\-\s]?)?[6-9]\d{9}/g) || []).length;
    if (phoneCount > 5) {
      findings.push({ category: 'BULK_PII_DETECTED', label: `Bulk phone number list (${phoneCount} numbers)`, value: `${phoneCount} phone numbers`, count: phoneCount });
    }
  }

  // Deduplicate by category
  const seen = new Set();
  const uniqueFindings = findings.filter(f => {
    const key = f.category + ':' + f.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── STEP 7: Auto-policy decision ─────────────────────────────────────────
  const { action, riskScore, riskLevel } = decidePolicyForFindings(uniqueFindings);

  return {
    action,
    riskScore,
    riskLevel,
    findings: uniqueFindings,
    categories: [...new Set(uniqueFindings.map(f => f.category))],
    message: buildMessage(action, uniqueFindings, fileObj.name),
    summary: buildSummary(uniqueFindings),
    fileMeta: { name: fileObj.name, type: fileObj.type, size: fileObj.size },
  };
}

/**
 * Redact the middle of a matched value for safe display.
 * E.g. "secret-value" -> "secr...alue"
 */
function redactSample(value) {
  if (!value || value.length <= 12) return value;
  return value.slice(0, 8) + '...' + value.slice(-4);
}

/**
 * Build a human-readable message for the employee's modal.
 */
function buildMessage(action, findings, filename) {
  const found = findings.map(f => {
    const val = f.value ? ` ("${f.value}")` : '';
    return `• ${f.label}${val}`;
  }).join('\n');

  if (action === 'BLOCK') {
    return `LlmXray has blocked your file "${filename || 'uploaded file'}". The following threats were detected:\n\n${found}`;
  }
  if (action === 'WARN') {
    return `LlmXray detected potentially sensitive content in "${filename || 'uploaded file'}":\n\n${found}\n\nPlease review before continuing.`;
  }
  return `File "${filename}" passed LlmXray security scan.`;
}

/**
 * Build a compact summary for audit logs.
 */
function buildSummary(findings) {
  if (!findings.length) return 'No threats detected';
  return findings.map(f => `${f.category}: ${f.label}`).join(' | ');
}

module.exports = { scanFile };
