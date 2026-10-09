'use client';
import { useIsMobile } from '@/lib/useDesktop';
import OwnerMobileApp from '@/components/OwnerMobileApp';

// The owner portal: chat-style app on phones, two-pane app on laptops.
export default function AdminPage() {
  const narrow = useIsMobile(700);
  if (narrow === null) return null;
  return <OwnerMobileApp layout={narrow ? 'mobile' : 'desktop'} />;
}
