import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Generates the app icon at any requested size (192, 512, 180 for iOS ...).
// ?maskable=1 adds extra padding so Android can crop it safely.
export async function GET(request, { params }) {
  const size = Math.min(Math.max(parseInt(params.size, 10) || 512, 64), 1024);
  const maskable = new URL(request.url).searchParams.get('maskable') === '1';
  const inner = Math.round(size * (maskable ? 0.52 : 0.62));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0807',
        }}
      >
        <div
          style={{
            width: inner, height: inner, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: Math.round(inner * 0.26),
            background: 'linear-gradient(135deg, #FF7035, #FF9F00)',
            color: '#fff', fontSize: Math.round(inner * 0.62), fontWeight: 800,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
