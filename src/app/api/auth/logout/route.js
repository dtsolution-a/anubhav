import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  
  const opts = { maxAge: 0, httpOnly: true, path: '/', sameSite: 'lax' };
  res.cookies.set('anx_token_owner', '', opts);
  res.cookies.set('anx_token_agency', '', opts);
  res.cookies.set('anx_token_client', '', opts);

  return res;
}
