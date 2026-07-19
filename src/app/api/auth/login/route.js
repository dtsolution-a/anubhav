import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { signToken, tokenCookieOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const upperCode = code.trim().toUpperCase();

    await connectDB();

    // Check for owner via env variable first (bootstrap)
    if (upperCode === process.env.OWNER_CODE?.toUpperCase()) {
      // Upsert the owner org
      let owner = await Organization.findOne({ type: 'owner' });
      if (!owner) {
        owner = await Organization.create({
          code: upperCode,
          type: 'owner',
          name: 'DT Solution',
          branding: {
            logoText: 'DT',
            accentColor: '#FF7035',
            accentSecondary: '#FF9F00',
            bgBase: '#0a0807',
            tagline: 'Experience Centre — Admin',
          },
        });
      }

      const token = signToken({
        orgId: owner._id.toString(),
        type: 'owner',
        name: owner.name,
        code: upperCode,
      });

      const opts = tokenCookieOptions('owner');
      const res = NextResponse.json({
        success: true,
        type: 'owner',
        redirect: '/admin',
        org: { name: owner.name, code: upperCode },
      });
      res.cookies.set(opts.name, token, opts);
      return res;
    }

    // Look up in DB
    const org = await Organization.findOne({ code: upperCode, isActive: true });
    if (!org) {
      return NextResponse.json({ error: 'Invalid ID. Please check and try again.' }, { status: 401 });
    }

    const token = signToken({
      orgId: org._id.toString(),
      type: org.type,
      name: org.name,
      code: upperCode,
    });

    const redirect = org.type === 'agency' ? '/workspace' : '/experience';
    const opts = tokenCookieOptions(org.type);

    const res = NextResponse.json({
      success: true,
      type: org.type,
      redirect,
      org: { name: org.name, code: upperCode, branding: org.branding },
    });
    res.cookies.set(opts.name, token, opts);
    return res;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
