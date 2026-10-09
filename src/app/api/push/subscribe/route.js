import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { getSession } from '@/lib/auth';

// Save this device's push subscription for the logged-in org
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subscription } = await request.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await connectDB();
  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      orgId: session.orgId,
      type: session.type,
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      userAgent: (request.headers.get('user-agent') || '').slice(0, 200),
    },
    { upsert: true, new: true }
  );
  return NextResponse.json({ success: true });
}

// Remove this device's subscription
export async function DELETE(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  await connectDB();
  await PushSubscription.deleteOne({ endpoint });
  return NextResponse.json({ success: true });
}
