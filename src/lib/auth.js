import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const TOKEN_NAME = 'anx_token';
const JWT_SECRET = () => process.env.JWT_SECRET;

// Token expiry by org type
const EXPIRY = {
  owner:  '100y',  // effectively permanent
  agency: '100y',  // persistent
  client: '7d',    // 7 days
};

const MAX_AGE = {
  owner:  100 * 365 * 24 * 3600,
  agency: 100 * 365 * 24 * 3600,
  client: 7 * 24 * 3600,
};

/**
 * Sign a JWT for the given org session
 */
export function signToken(payload) {
  const type = payload.type || 'client';
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET(),
    { algorithm: 'HS256', expiresIn: EXPIRY[type] }
  );
}

/**
 * Verify a JWT synchronously
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET(), { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

/**
 * Read + verify session from the request cookie (server-side)
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Build Set-Cookie header options for the token
 */
export function tokenCookieOptions(type) {
  return {
    name: TOKEN_NAME,
    maxAge: MAX_AGE[type] || MAX_AGE.client,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  };
}

export { TOKEN_NAME };
