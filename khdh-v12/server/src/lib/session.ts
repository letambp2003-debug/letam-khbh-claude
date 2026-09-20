import crypto from 'node:crypto';

/**
 * Session token don gian, tu ky (HMAC-SHA256), khong can bang session hay
 * Redis rieng cho ban local/M1 nay. Token = base64url(payload) + "." +
 * base64url(hmac). Payload chi chua email + thoi diem het han -- KHONG chua
 * bat ky bi mat nao khac.
 *
 * Day la co che tam thoi cho local dev / M1; khi trien khai that len domain
 * cong khai nen thay bang cookie HttpOnly+Secure ky boi thu vien session
 * truong thanh (vi du iron-session) -- da ghi ro trong SECURITY_NOTES.md.
 */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error('SESSION_SECRET chua duoc cau hinh. Sinh bang: openssl rand -base64 32');
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function createSessionToken(email: string): string {
  const payload = JSON.stringify({ email, exp: Date.now() + SEVEN_DAYS_MS });
  const payloadB64 = b64url(Buffer.from(payload, 'utf8'));
  const sig = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifySessionToken(token: string | undefined | null): { email: string } | null {
  if (!token) return null;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest();
  const gotSig = Buffer.from(sigB64, 'base64url');
  if (expectedSig.length !== gotSig.length || !crypto.timingSafeEqual(expectedSig, gotSig)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}
