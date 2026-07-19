import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Revision from '@/models/Revision';
import Project from '@/models/Project';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';

// GET revisions — filtered by project or all (owner sees all)
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const statusFilter = searchParams.get('status');

  await connectDB();

  let query = {};

  if (session.type === 'owner') {
    if (projectId) query.projectId = projectId;
  } else if (session.type === 'agency') {
    const org = await Organization.findById(session.orgId).lean();
    query.responsibleAgencyId = org._id;
    if (projectId) query.projectId = projectId;
  } else if (session.type === 'client') {
    // Client can only see revisions they raised
    query.raisedByOrgId = session.orgId;
    if (projectId) query.projectId = projectId;
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (statusFilter) query.status = statusFilter;

  const revisions = await Revision.find(query)
    .populate('projectId', 'title')
    .populate('raisedByOrgId', 'name')
    .populate('responsibleAgencyId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ revisions });
}

// POST — raise a new revision
export async function POST(request) {
  const session = await getSession();
  if (!session || session.type === 'owner') {
    return NextResponse.json({ error: 'Only agencies and clients can raise revisions' }, { status: 403 });
  }

  const body = await request.json();
  const { projectId, title, message, imageUrl } = body;
  if (!projectId || !title || !message) {
    return NextResponse.json({ error: 'projectId, title, message required' }, { status: 400 });
  }

  await connectDB();

  const project = await Project.findById(projectId).lean();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const org = await Organization.findById(session.orgId).lean();

  // Determine responsible agency
  const responsibleAgencyId = project.agencyId;

  const revision = await Revision.create({
    projectId,
    raisedByOrgId: org._id,
    raisedByType: session.type,
    raisedByName: org.name,
    responsibleAgencyId,
    title,
    thread: [{
      authorOrgId: org._id,
      authorType: session.type,
      authorName: org.name,
      message,
      imageUrl: imageUrl || null,
    }],
  });

  return NextResponse.json({ revision }, { status: 201 });
}
