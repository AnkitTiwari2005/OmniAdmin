import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { CustomersTable } from '@/components/customers/CustomersTable';

async function fetchCustomers(
  workspace: string,
  filters: { search?: string; page: number }
) {
  if (workspace === 'houserve') {
    const { getHouserveCustomers } = await import('@/integrations/houserve/queries');
    return getHouserveCustomers(filters);
  }
  if (workspace === 'shudhham') {
    const { getShudhhamCustomers } = await import('@/integrations/shudhham/queries');
    return getShudhhamCustomers(filters);
  }
  if (workspace === 'buildkart') {
    const { getBuildKartCustomers } = await import('@/integrations/buildkart/queries');
    return getBuildKartCustomers(filters);
  }
  return { customers: [], total: 0 };
}

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ page?: string; search?: string; q?: string }>;
}

export default async function CustomersPage({ params, searchParams }: PageProps) {
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
  let customers: any[] = [];
  let total = 0;
  let isNotConfigured = false;

  if (!key || key.includes('MISSING')) {
    isNotConfigured = true;
  } else {
    try {
      const res = await fetchCustomers(workspace, { search: currentSearch, page });
      customers = res.customers;
      total = res.total;
    } catch {
      isNotConfigured = true;
    }
  }

  if (isNotConfigured) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Customers" description={ws.name} />
        <NotConfiguredCard workspaceName={ws.name} envKey={envNameMap[workspace] ?? 'SERVICE_ROLE_KEY'} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Customers" description={`${ws.name} · ${total} total registered`} />
      <CustomersTable
        customers={customers}
        total={total}
        currentPage={page}
        currentSearch={currentSearch}
      />
    </div>
  );
}
