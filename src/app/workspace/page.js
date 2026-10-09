'use client';
import { useIsMobile } from '@/lib/useDesktop';
import AgencyMobileApp from '@/components/AgencyMobileApp';

// The agency portal: chat-style app on phones, two-pane app on laptops.
export default function WorkspacePage() {
  const narrow = useIsMobile(700);
  if (narrow === null) return null;
  return <AgencyMobileApp layout={narrow ? 'mobile' : 'desktop'} />;
}
