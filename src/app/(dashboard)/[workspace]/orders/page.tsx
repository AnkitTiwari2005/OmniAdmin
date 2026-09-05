import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { OrdersTable } from '@/components/orders/OrdersTable';

async function fetchOrders(
  workspace: string,
  filters: { status?: string; search?: string; page?: number }
) {
  if (workspace === 'shudhham') {
    const { getShudhhamOrders } = await import('@/integrations/shudhham/queries');
    return getShudhhamOrders(filters);
  }
  if (workspace === 'buildkart') {
    const { getBuildKartOrders } = await import('@/integrations/buildkart/queries');
    return getBuildKartOrders(filters);
  }
  return { orders: [], total: 0 };
}

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ status?: string; search?: string; q?: string; page?: string }>;
}

export default async function OrdersPage({ params, searchParams }: PageProps) {
  const { workspace } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws || (workspace !== 'shudhham' && workspace !== 'buildkart')) notFound();

  const { status, search, q, page: pageStr } = await searchParams;
  const currentSearch = q || search || '';
  const page = parseInt(pageStr ?? '1') || 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orders: any[] = [];
  let total = 0;
  let isNotConfigured = false;

  const key =
    workspace === 'shudhham'
      ? process.env.SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY
      : process.env.BUILDKART_SUPABASE_SERVICE_ROLE_KEY;

  if (!key || key.includes('MISSING')) {
    isNotConfigured = true;
  } else {
    try {
      const res = await fetchOrders(workspace, {
        status: status || undefined,
        search: currentSearch || undefined,
        page,
      });
      orders = res.orders;
      total = res.total;
    } catch {
      isNotConfigured = true;
    }
  }

  if (isNotConfigured) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    const envKey =
      workspace === 'shudhham'
        ? 'SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY'
        : 'BUILDKART_SUPABASE_SERVICE_ROLE_KEY';
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Orders" description={ws.name} />
        <NotConfiguredCard workspaceName={ws.name} envKey={envKey} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Orders" description={`${ws.name} · ${total} total`} />
      <OrdersTable
        workspace={workspace as 'shudhham' | 'buildkart'}
        orders={orders}
        total={total}
        currentPage={page}
        currentStatus={status ?? ''}
        currentSearch={currentSearch}
      />
    </div>
  );
}
