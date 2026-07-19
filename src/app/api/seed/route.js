// One-time seed route to bootstrap the owner org
// Call: POST /api/seed with { secret: process.env.OWNER_CODE }
// Only works once if no owner exists yet

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

export async function POST(request) {
  // Only allow in production if explicit SEED_ENABLED env is set
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ENABLED) {
    return NextResponse.json({ error: 'Seed disabled in production' }, { status: 403 });
  }

  const { secret } = await request.json();
  if (secret !== process.env.OWNER_CODE) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  await connectDB();

  const existing = await Organization.findOne({ type: 'owner' });
  if (existing) {
    return NextResponse.json({ message: 'Owner already exists', org: existing });
  }

  const owner = await Organization.create({
    code: process.env.OWNER_CODE,
    type: 'owner',
    name: 'DTS Media',
    branding: {
      logoText: 'DTS',
      accentColor: '#FF7035',
      accentSecondary: '#FF9F00',
      accentGradient: 'linear-gradient(135deg,#FF7035,#FF9F00)',
      accentGlow: 'rgba(255,112,53,0.28)',
      accentLight: 'rgba(255,112,53,0.1)',
      bgBase: '#0a0807',
      tagline: 'Experience Centre Admin',
    },
  });

  return NextResponse.json({ message: 'Owner seeded successfully', org: owner }, { status: 201 });
}
