const crypto = require('crypto');

const TOKEN_TTL_SECONDS = Number(process.env.ADMIN_TOKEN_TTL_SECONDS || 8 * 60 * 60);
const DEFAULT_DEV_EMAIL = 'admin@llmxray.local';
const DEFAULT_DEV_PASSWORD = 'ChangeMe123!';

const ROLE_PERMISSIONS = {
  admin: ['audit:read', 'audit:verify', 'policy:read', 'policy:write', 'review:read', 'review:write', 'device:read', 'device:write'],
  auditor: ['audit:read', 'audit:verify', 'policy:read', 'review:read', 'device:read'],
  reviewer: ['audit:read', 'policy:read', 'review:read', 'review:write', 'device:read'],
};

function getAdminEmail() {
  return process.env.ADMIN_EMAIL || DEFAULT_DEV_EMAIL;
}

function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH || hashPassword(DEFAULT_DEV_PASSWORD);
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-only-change-this-llmxray-secret';
}

function isUsingDefaultCredentials() {
  return !process.env.ADMIN_USERS_JSON && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH || !process.env.JWT_SECRET);
}

function loadUsers() {
  if (process.env.ADMIN_USERS_JSON) {
    try {
      const users = JSON.parse(process.env.ADMIN_USERS_JSON);
      if (Array.isArray(users)) {
        return users
          .filter(user => user.email && user.passwordHash)
          .map(user => ({
            email: user.email,
            passwordHash: user.passwordHash,
            role: normalizeRole(user.role),
          }));
      }
    } catch {
      return [];
    }
  }

  return [{
    email: getAdminEmail(),
    passwordHash: getAdminPasswordHash(),
    role: 'admin',
  }];
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

function verifyPassword(password, encodedHash) {
  const [scheme, iterations, salt, expected] = String(encodedHash).split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !expected) return false;

  const actual = crypto
    .pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256')
    .toString('hex');

  return safeEqual(actual, expected);
}

function signToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const headerPart = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const bodyPart = base64url(JSON.stringify(body));
  const signature = sign(`${headerPart}.${bodyPart}`);
  return `${headerPart}.${bodyPart}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const [headerPart, bodyPart, signature] = parts;
  const expected = sign(`${headerPart}.${bodyPart}`);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(bodyPart, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function authenticateAdmin(email, password) {
  const userRecord = loadUsers().find(user => user.email === email);
  if (!userRecord) return null;
  if (!verifyPassword(password, userRecord.passwordHash)) return null;

  const user = {
    email,
    role: userRecord.role,
    permissions: permissionsForRole(userRecord.role),
  };
  return {
    user,
    token: signToken({ sub: email, role: user.role, permissions: user.permissions }),
    expiresIn: TOKEN_TTL_SECONDS,
  };
}

function permissionsForRole(role) {
  return ROLE_PERMISSIONS[normalizeRole(role)] || ROLE_PERMISSIONS.auditor;
}

function normalizeRole(role) {
  return ROLE_PERMISSIONS[role] ? role : 'auditor';
}

function sign(value) {
  return crypto.createHmac('sha256', getJwtSecret()).update(value).digest('base64url');
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = {
  authenticateAdmin,
  getAdminEmail,
  hashPassword,
  isUsingDefaultCredentials,
  permissionsForRole,
  verifyToken,
};
