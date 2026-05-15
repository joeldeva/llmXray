const path = require('path');

const DANGEROUS_FILENAMES = new Set(['.env', 'id_rsa', 'id_ed25519']);
const DANGEROUS_EXTENSIONS = new Set(['.p12', '.pfx', '.pem', '.key']);
const TEXT_EXTENSIONS = new Set(['.txt', '.csv']);

async function extractFileText(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (TEXT_EXTENSIONS.has(extension)) {
    return file.buffer.toString('utf8');
  }

  if (extension === '.pdf') {
    const pdfParse = require('pdf-parse');
    const parsed = await pdfParse(file.buffer);
    return parsed.text || '';
  }

  if (extension === '.docx') {
    const mammoth = require('mammoth');
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value || '';
  }

  if (extension === '.xlsx') {
    const xlsx = require('xlsx');
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    return workbook.SheetNames
      .map(sheetName => xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]))
      .join('\n');
  }

  const error = new Error('unsupported file type');
  error.statusCode = 400;
  throw error;
}

function isDangerousFile(fileName) {
  const baseName = path.basename(fileName || '').toLowerCase();
  const extension = path.extname(baseName);
  return DANGEROUS_FILENAMES.has(baseName) || DANGEROUS_EXTENSIONS.has(extension);
}

function buildFileMeta(file) {
  return {
    name: file.originalname,
    type: file.mimetype || 'application/octet-stream',
    size: file.size,
  };
}

module.exports = { buildFileMeta, extractFileText, isDangerousFile };
