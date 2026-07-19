import { NextResponse } from 'next/server';
import { TOKEN_NAME } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(TOKEN_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });
  return res;
}
