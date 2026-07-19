import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';

export async function GET(_, { params }) {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const org = await Organization.findById(params.id).lean();
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ org });
}

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const body = await request.json();
  const org = await Organization.findByIdAndUpdate(params.id, { $set: body }, { new: true }).lean();
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ org });
}

export async function DELETE(_, { params }) {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  await Organization.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
