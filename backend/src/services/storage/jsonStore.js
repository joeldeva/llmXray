const fs = require('fs');
const path = require('path');

function dataPath(filename) {
  const dataDir = process.env.LLMXRAY_DATA_DIR || path.join(__dirname, '../../data');
  return path.join(dataDir, filename);
}

function readJson(filename, fallback) {
  const filePath = dataPath(filename);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(filename, value) {
  const filePath = dataPath(filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

module.exports = { dataPath, readJson, writeJson };
