const crypto = require('crypto');

const SECRET = process.env.DASHBOARD_PASSWORD || 'fallback-secret';
const TTL_MS = 4 * 60 * 60 * 1000; // 4 horas

function signToken(expiresAt) {
  const payload = String(expiresAt);
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function verifyToken(token) {
  if (!token) return false;
  const [payload, hmac] = token.split('.');
  if (!payload || !hmac) return false;

  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(hmac);
  if (expectedBuf.length !== actualBuf.length) return false;
  if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return false;

  return Date.now() < Number(payload);
}

function tokenFromEvent(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  return auth.replace(/^Bearer\s+/i, '').trim() || null;
}

module.exports = { signToken, verifyToken, tokenFromEvent, TTL_MS };
