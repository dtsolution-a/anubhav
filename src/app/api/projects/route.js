import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';

// GET projects — owner gets all, agency gets theirs
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  let query = {};
  if (session.type === 'agency') {
    const org = await Organization.findById(session.orgId).lean();
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    query = { agencyId: org._id };
  } else if (session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const projects = await Project.find(query)
    .populate('agencyId', 'name branding')
    .populate('clientOrgId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(projects);
}

// POST — create project (owner only)
export async function POST(request) {
  const session = await getSession();
  if (!session || session.type !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, previewUrl, status, agencyId, clientCode, clientOrgId, deliveredOn } = body;

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  await connectDB();
  const owner = await Organization.findOne({ type: 'owner' }).lean();

  const project = await Project.create({
    title,
    description: description || '',
    previewUrl: previewUrl || '',
    status: status || 'active',
    ownerId: owner._id,
    agencyId: agencyId || null,
    clientCode: clientCode || null,
    clientOrgId: clientOrgId || null,
    deliveredOn: deliveredOn || null,
    documents: [],
  });

  return NextResponse.json({ project }, { status: 201 });
}
