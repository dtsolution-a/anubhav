// API route to look up client experience by code
// Used by /experience page to fetch branding + project info
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Organization from '@/models/Organization';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession('client');
  if (!session || session.type !== 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  // Find the client org
  const clientOrg = await Organization.findById(session.orgId).lean();
  if (!clientOrg) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  // Find the project linked to this client org (via clientCode matching their session code)
  const project = await Project.findOne({ clientCode: session.code })
    .populate('agencyId', 'name branding')
    .populate('ownerId', 'name branding')
    .lean();

  if (!project) {
    return NextResponse.json({ error: 'No project found for this code' }, { status: 404 });
  }

  // The experience is branded under the AGENCY (or owner if no agency)
  const brand = project.agencyId?.branding || project.ownerId?.branding;
  const brandName = project.agencyId?.name || project.ownerId?.name;

  return NextResponse.json({
    project: {
      _id: project._id,
      id: project._id,
      title: project.title,
      previewUrl: project.previewUrl,
      status: project.status,
    },
    clientOrg: { name: clientOrg.name },
    brand: { ...brand, name: brandName },
  });
}
