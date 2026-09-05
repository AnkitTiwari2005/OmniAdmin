import { redirect, notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { getHouserveTechnicians, getHouservePromotableCustomers } from '@/integrations/houserve/queries';
import { TechniciansPanel } from '@/components/houserve/TechniciansPanel';

interface PageProps {
  params: Promise<{ workspace: string }>;
}

export default async function TechniciansPage({ params }: PageProps) {
  const { workspace } = await params;
  if (workspace !== 'houserve') redirect(`/${workspace}`);

  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const key = process.env.HOUSERVE_SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes('MISSING')) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Technicians" description="Houserve" />
        <NotConfiguredCard workspaceName="Houserve" envKey="HOUSERVE_SUPABASE_SERVICE_ROLE_KEY" />
      </div>
    );
  }

  let technicians: import('@/integrations/houserve/types').HouserveTechnician[] = [];
  let promotableCustomers: Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }> = [];

  try {
    [technicians, promotableCustomers] = await Promise.all([
      getHouserveTechnicians(),
      getHouservePromotableCustomers(),
    ]);
  } catch {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Technicians" description="Houserve" />
        <NotConfiguredCard workspaceName="Houserve" envKey="HOUSERVE_SUPABASE_SERVICE_ROLE_KEY" />
      </div>
    );
  }

  const busyCount = technicians.filter((t) => (t.active_bookings ?? 0) > 0).length;
  const activeCount = technicians.filter((t) => t.is_active !== false).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Technicians"
        description={`${technicians.length} registered · ${activeCount} active · ${busyCount} currently on job`}
      />
      <TechniciansPanel
        technicians={technicians}
        promotableCustomers={promotableCustomers}
      />
    </div>
  );
}
