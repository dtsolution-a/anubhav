'use client';
import { useIsMobile } from '@/lib/useDesktop';
import AgencyMobileApp from '@/components/AgencyMobileApp';

// Deep link into one project (used by notifications and shared links).
export default function WorkspaceProjectPage({ params }) {
  const narrow = useIsMobile(700);
  if (narrow === null) return null;
  return <AgencyMobileApp layout={narrow ? 'mobile' : 'desktop'} initialProjectId={params.projectId} />;
}
