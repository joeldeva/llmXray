function normalizeForDetection(text) {
  return String(text || '')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\[dot\]/gi, '.')
    .replace(/\[at\]/gi, '@')
    .replace(/\(dot\)/gi, '.')
    .replace(/\(at\)/gi, '@')
    .replace(/(?<=\b[A-Za-z0-9])\s+(?=[A-Za-z0-9]\b)/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\b(?:[A-Za-z]-){2,}[A-Za-z]\b/g, value => value.replace(/-/g, ''))
    .replace(/\b(?:[0-9]-){2,}[0-9]\b/g, value => value.replace(/-/g, ''))
    .replace(/-{2,}/g, '-');
}

module.exports = { normalizeForDetection };
