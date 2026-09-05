import { redirect, notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { BookingsTable } from '@/components/houserve/BookingsTable';
import { getHouserveBookings, getHouserveTechnicians } from '@/integrations/houserve/queries';

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}

export default async function BookingsPage({ params, searchParams }: PageProps) {
  const { workspace } = await params;

  // Only Houserve has bookings
  if (workspace !== 'houserve') redirect(`/${workspace}`);

  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const { status, q, page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? '1') || 1;

  const key = process.env.HOUSERVE_SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes('MISSING')) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Bookings" description="Houserve" />
        <NotConfiguredCard workspaceName="Houserve" envKey="HOUSERVE_SUPABASE_SERVICE_ROLE_KEY" />
      </div>
    );
  }

  try {
    const [{ bookings, total }, technicians] = await Promise.all([
      getHouserveBookings({ status, search: q, page }),
      getHouserveTechnicians(),
    ]);

    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Bookings"
          description={`Houserve · ${total} total`}
        />
        <BookingsTable
          bookings={bookings}
          total={total}
          technicians={technicians}
          currentPage={page}
          currentStatus={status ?? ''}
          currentSearch={q ?? ''}
        />
      </div>
    );
  } catch {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Bookings" description="Houserve" />
        <NotConfiguredCard workspaceName="Houserve" envKey="HOUSERVE_SUPABASE_SERVICE_ROLE_KEY" />
      </div>
    );
  }
}
