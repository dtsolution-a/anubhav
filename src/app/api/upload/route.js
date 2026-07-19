import { NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dataUrl, folder } = await request.json();
  if (!dataUrl) return NextResponse.json({ error: 'dataUrl required' }, { status: 400 });

  // Validate it's a base64 image
  if (!dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Only images are supported' }, { status: 400 });
  }

  // Limit size (~5MB base64)
  if (dataUrl.length > 7 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 413 });
  }

  const { url, publicId } = await uploadToCloudinary(
    dataUrl,
    `anubhavah/${folder || 'revisions'}`
  );

  return NextResponse.json({ url, publicId });
}
