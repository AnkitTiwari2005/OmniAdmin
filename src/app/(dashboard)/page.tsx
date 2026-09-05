import { redirect } from 'next/navigation';
import { DEFAULT_WORKSPACE } from '@/lib/workspace';
import { requireAdmin } from '@/lib/auth';

// Root "/" redirects to the first accessible workspace
export default async function RootPage() {
  const admin = await requireAdmin();

  if (admin.role === 'super_admin') {
    redirect('/overview');
  }

  // For single-workspace admins, go directly to their workspace
  const workspace = admin.role.replace('_admin', '') as string;
  redirect(`/${workspace}`);
}
