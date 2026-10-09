import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that require authentication and which role
const PROTECTED = [
  { path: '/admin',     role: 'owner' },
  { path: '/workspace', role: 'agency' },
  { path: '/experience',role: 'client' },
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip static assets, api, and _next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // ── AUTH GUARD ────────────────────────────────────────────────
  const matched = PROTECTED.find(p => pathname.startsWith(p.path));
  if (matched) {
    const tokenName = `anx_token_${matched.role}`;
    const token = request.cookies.get(tokenName)?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      // Role mismatch → redirect home
      if (payload.type !== matched.role) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      // Invalid/expired token
      const res = NextResponse.redirect(new URL('/', request.url));
      res.cookies.delete(tokenName);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
