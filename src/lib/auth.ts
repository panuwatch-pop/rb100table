import crypto from 'crypto';
import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'reunion_admin_session';
const SECRET = process.env.ADMIN_SECRET || 'reunion_table_booking_secret_key_2026';

export function createSessionToken(username: string): string {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = JSON.stringify({ username, exp: expiry });
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadB64, signature] = parts;
    const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf-8');
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false };
    }
    const data = JSON.parse(payloadStr);
    if (data.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, username: data.username };
  } catch {
    return { valid: false };
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) return false;
  const result = verifySessionToken(sessionCookie.value);
  return result.valid;
}

export { AUTH_COOKIE_NAME };
