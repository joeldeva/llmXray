const { scanPrompt } = require('./scanPrompt');

const HIGH_RISK_EXTENSIONS = ['.exe', '.bat', '.sh', '.ps1', '.cmd', '.vbs', '.msi'];
const BINARY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.pdf', '.docx', '.xlsx', '.zip', '.rar'];

/**
 * Scan a file object (name, type, size, optional content).
 */
function scanFile(file) {
  const { name, type, size, content } = file;
  const ext = name ? '.' + name.split('.').pop().toLowerCase() : '';

  // Binary files - no content analysis, flag for review
  if (BINARY_EXTENSIONS.includes(ext)) {
    return {
      riskScore: 50,
      riskLevel: 'MEDIUM',
      findings: { fileType: 'BINARY_OR_DOCUMENT', ext },
      allFindings: [{ ruleId: 'BINARY_FILE', label: `Binary/Document file (${ext}) requires deep scan`, severity: 'medium' }],
      deepScanRequired: true,
    };
  }

  // Executable files
  if (HIGH_RISK_EXTENSIONS.includes(ext)) {
    return {
      riskScore: 95,
      riskLevel: 'CRITICAL',
      findings: { fileType: 'EXECUTABLE' },
      allFindings: [{ ruleId: 'EXECUTABLE_FILE', label: `Executable file (${ext}) blocked by policy`, severity: 'critical' }],
      deepScanRequired: false,
    };
  }

  // Text-based file with content
  if (content) {
    const result = scanPrompt(content);
    return {
      ...result,
      deepScanRequired: false,
    };
  }

  // Unknown type, no content
  return {
    riskScore: 30,
    riskLevel: 'LOW',
    findings: {},
    allFindings: [],
    deepScanRequired: false,
  };
}

module.exports = { scanFile };
