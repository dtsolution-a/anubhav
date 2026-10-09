import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Revision from '@/models/Revision';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';

// Lightweight inbox: one row per revision with just the latest message.
// Used for unread badges and the owner's live dashboard without downloading full threads/images.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const orgId = new mongoose.Types.ObjectId(session.orgId);
  let match = {};
  if (session.type === 'agency') match = { responsibleAgencyId: orgId, isDeletedByClient: { $ne: true } };
  else if (session.type === 'client') match = { raisedByOrgId: orgId, isDeletedByClient: { $ne: true } };

  const rows = await Revision.aggregate([
    { $match: match },
    { $sort: { updatedAt: -1 } },
    { $limit: 150 },
    {
      $project: {
        title: 1, status: 1, projectId: 1, raisedByName: 1, raisedByType: 1, createdAt: 1, updatedAt: 1,
        count: { $size: { $ifNull: ['$thread', []] } },
        last: { $arrayElemAt: ['$thread', -1] },
      },
    },
    {
      $project: {
        title: 1, status: 1, projectId: 1, raisedByName: 1, raisedByType: 1, createdAt: 1, updatedAt: 1, count: 1,
        lastMessage: '$last.message', lastType: '$last.authorType', lastName: '$last.authorName',
        lastAt: '$last.timestamp', lastHasImage: { $cond: [{ $ifNull: ['$last.imageUrl', false] }, true, false] },
      },
    },
  ]);

  await Project.populate(rows, { path: 'projectId', select: 'title', model: Project });

  return NextResponse.json(rows.map(r => ({
    id: String(r._id),
    projectId: String(r.projectId?._id || r.projectId),
    projectTitle: r.projectId?.title || '',
    title: r.title,
    status: r.status,
    raisedByName: r.raisedByName,
    count: r.count,
    lastMessage: (r.lastMessage || '').slice(0, 160),
    lastType: r.lastType || null,
    lastName: r.lastName || '',
    lastAt: r.lastAt || r.updatedAt || r.createdAt,
    lastHasImage: !!r.lastHasImage,
  })));
}
