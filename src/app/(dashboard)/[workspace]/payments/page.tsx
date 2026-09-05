import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { PaymentsTable } from '@/components/payments/PaymentsTable';

async function fetchPayments(
  workspace: string,
  filters: { search?: string; page: number }
) {
  if (workspace === 'houserve') {
    const { getHouservePayments } = await import('@/integrations/houserve/queries');
    return getHouservePayments(filters);
  }
  if (workspace === 'shudhham') {
    const { getShudhhamPayments } = await import('@/integrations/shudhham/queries');
    return getShudhhamPayments(filters);
  }
  if (workspace === 'buildkart') {
    const { getBuildKartPayments } = await import('@/integrations/buildkart/queries');
    return getBuildKartPayments(filters);
  }
  return { payments: [], total: 0 };
}

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ page?: string; search?: string; q?: string }>;
}

export default async function PaymentsPage({ params, searchParams }: PageProps) {
  const { workspace } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const { page: pageStr, search, q } = await searchParams;
  const currentSearch = q || search || '';
  const page = parseInt(pageStr ?? '1') || 1;

  const keyMap: Record<string, string> = {
    shudhham: process.env.SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY ?? '',
    houserve: process.env.HOUSERVE_SUPABASE_SERVICE_ROLE_KEY ?? '',
    buildkart: process.env.BUILDKART_SUPABASE_SERVICE_ROLE_KEY ?? '',
  };
  const envNameMap: Record<string, string> = {
    shudhham: 'SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY',
    houserve: 'HOUSERVE_SUPABASE_SERVICE_ROLE_KEY',
    buildkart: 'BUILDKART_SUPABASE_SERVICE_ROLE_KEY',
  };

  const key = keyMap[workspace] ?? '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payments: any[] = [];
  let total = 0;
  let isNotConfigured = false;

  if (!key || key.includes('MISSING')) {
    isNotConfigured = true;
  } else {
    try {
      const res = await fetchPayments(workspace, { search: currentSearch, page });
      payments = res.payments;
      total = res.total;
    } catch {
      isNotConfigured = true;
    }
  }

  if (isNotConfigured) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Payments" description={ws.name} />
        <NotConfiguredCard workspaceName={ws.name} envKey={envNameMap[workspace] ?? 'SERVICE_ROLE_KEY'} />
      </div>
    );
  }

  // Compute summary
  const paid = payments.filter((p) => p.payment_status === 'paid' || p.payment_status === 'completed');
  const totalRevenue = paid.reduce((s, p) => s + (p.total_amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Payments"
        description={`${ws.name} · Transactions & Gateway Records`}
      />
      <PaymentsTable
        workspace={workspace}
        payments={payments}
        total={total}
        totalRevenue={totalRevenue}
        currentPage={page}
        currentSearch={currentSearch}
      />
    </div>
  );
}
