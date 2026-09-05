import { requireSuperAdmin } from '@/lib/auth';
import { getRecentActivity } from '@/lib/audit';
import { PageHeader } from '@/components/shell/PageHeader';
import { ActivityLogTable } from '@/components/activity/ActivityLogTable';

export default async function ActivityPage() {
  await requireSuperAdmin();
  const entries = await getRecentActivity(100);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Audit Activity Log"
        description="Unified ledger of administrative actions and mutations across all workspaces"
      />
      <ActivityLogTable entries={entries} />
    </div>
  );
}
