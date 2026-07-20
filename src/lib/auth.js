import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';

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
export async function getSession(preferredRole = null) {
  const cookieStore = await cookies();
  let role = preferredRole;

  if (!role) {
    try {
      const headersList = await headers();
      const referer = headersList.get('referer') || '';
      if (referer.includes('/experience')) role = 'client';
      else if (referer.includes('/workspace')) role = 'agency';
      else if (referer.includes('/admin')) role = 'owner';
    } catch {
      // ignore
    }
  }
  
  if (role) {
    const token = cookieStore.get(`anx_token_${role}`)?.value;
    if (token) {
      const sess = verifyToken(token);
      if (sess) return sess;
    }
  }

  for (const r of ['owner', 'agency', 'client']) {
    const token = cookieStore.get(`anx_token_${r}`)?.value;
    if (token) {
      const sess = verifyToken(token);
      if (sess) return sess;
    }
  }
  return null;
}

/**
 * Build Set-Cookie header options for the token
 */
export function tokenCookieOptions(type) {
  return {
    name: `anx_token_${type}`,
    maxAge: MAX_AGE[type] || MAX_AGE.client,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  };
}
