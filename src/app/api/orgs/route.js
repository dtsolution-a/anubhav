import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';

// GET all orgs (owner only)
export async function GET() {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const orgs = await Organization.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json(orgs);
}

// POST — create a new org (owner only)
export async function POST(request) {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { code, type, name, branding } = body;

  if (!code || !type || !name) {
    return NextResponse.json({ error: 'code, type, and name are required' }, { status: 400 });
  }

  await connectDB();

  try {
    const org = await Organization.create({ code, type, name, branding: branding || {} });
    return NextResponse.json({ org }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Code already exists' }, { status: 409 });
    }
    throw err;
  }
}
