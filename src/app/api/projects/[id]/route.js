import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';

import mongoose from 'mongoose';

async function getProjectAndCheckAccess(projectId, session) {
  await connectDB();
  
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return { error: 'Not found', status: 404 };
  }

  const project = await Project.findById(projectId)
    .populate('agencyId', 'name branding code')
    .populate('ownerId', 'name branding')
    .lean();
  if (!project) return { error: 'Not found', status: 404 };

  if (session.type === 'owner') return { project };

  if (session.type === 'agency') {
    const org = await Organization.findById(session.orgId).lean();
    if (!org || project.agencyId?._id.toString() !== org._id.toString()) {
      return { error: 'Forbidden', status: 403 };
    }
    return { project };
  }

  // Client — must match clientCode
  return { error: 'Forbidden', status: 403 };
}

// GET a single project
export async function GET(_, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { project, error, status } = await getProjectAndCheckAccess(params.id, session);
  if (error) return NextResponse.json({ error }, { status });
  return NextResponse.json(project);
}

// PUT — update project (owner only)
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const body = await request.json();

  // If adding a document
  if (body._addDocument) {
    const { label, url, type } = body._addDocument;
    const doc = { label, url, type: type || 'other', addedAt: new Date() };
    const project = await Project.findByIdAndUpdate(
      params.id,
      { $push: { documents: doc } },
      { new: true }
    ).lean();
    return NextResponse.json(project);
  }

  // If removing a document
  if (body._removeDocumentId) {
    const project = await Project.findByIdAndUpdate(
      params.id,
      { $pull: { documents: { _id: body._removeDocumentId } } },
      { new: true }
    ).lean();
    return NextResponse.json(project);
  }

  // Regular update
  const allowed = ['title', 'description', 'previewUrl', 'status', 'agencyId', 'clientCode', 'clientOrgId', 'deliveredOn'];
  const update = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const project = await Project.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(project);
}

// DELETE (owner only)
export async function DELETE(_, { params }) {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  await Project.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
