import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Revision from '@/models/Revision';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';
import mongoose from 'mongoose';

// GET single revision
export async function GET(_, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!mongoose.Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await connectDB();
  const revision = await Revision.findById(params.id)
    .populate('projectId', 'title agencyId')
    .populate('raisedByOrgId', 'name')
    .lean();
  if (!revision) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(revision);
}

// PUT — reply to thread OR change status
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!mongoose.Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  await connectDB();

  const revision = await Revision.findById(params.id);
  if (!revision) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const org = await Organization.findById(session.orgId).lean();

  // Add thread message
  if (body._addMessage) {
    const { message, imageUrl } = body._addMessage;
    revision.thread.push({
      authorOrgId: org._id,
      authorType: session.type,
      authorName: org.name,
      message,
      imageUrl: imageUrl || null,
    });
    // Auto-move to in-progress when agency/owner replies
    if (session.type !== 'client' && revision.status === 'open') {
      revision.status = 'in-progress';
    }
    await revision.save();
    return NextResponse.json(revision.toObject());
  }

  // Change status (agency or owner can resolve/close)
  if (body.status && session.type !== 'client') {
    revision.status = body.status;
    if (body.status === 'resolved' || body.status === 'closed') {
      revision.resolvedAt = new Date();
    }
    await revision.save();
    return NextResponse.json(revision.toObject());
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}
