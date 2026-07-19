import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Note from '@/models/Note';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

// GET notes for a project+org combo
export async function GET(request) {
  const session = await getSession();
  if (!session || session.type === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  await connectDB();
  const org = await Organization.findById(session.orgId).lean();
  const note = await Note.findOne({ projectId, orgId: org._id }).lean();
  return NextResponse.json(note?.entries || []);
}

// POST — add a note entry
export async function POST(request) {
  const session = await getSession();
  if (!session || session.type === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId, label, value } = await request.json();
  if (!projectId || !label || !value) {
    return NextResponse.json({ error: 'projectId, label, value required' }, { status: 400 });
  }

  await connectDB();
  const org = await Organization.findById(session.orgId).lean();

  const entry = { _id: uuid(), label, value, addedAt: new Date() };
  const note = await Note.findOneAndUpdate(
    { projectId, orgId: org._id },
    { $push: { entries: entry }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(note.entries, { status: 201 });
}

// DELETE — remove a note entry by entry _id
export async function DELETE(request) {
  const session = await getSession();
  if (!session || session.type === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId, entryId } = await request.json();
  await connectDB();
  const org = await Organization.findById(session.orgId).lean();

  const note = await Note.findOneAndUpdate(
    { projectId, orgId: org._id },
    { $pull: { entries: { _id: entryId } } },
    { new: true }
  ).lean();

  return NextResponse.json(note?.entries || []);
}
