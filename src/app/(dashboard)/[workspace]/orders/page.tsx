import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';

const SHUDHHAM_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];
const BUILDKART_STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'info' | 'destructive' | 'secondary'> = {
  processing: 'warning', Processing: 'warning',
  shipped: 'info', Shipped: 'info',
  delivered: 'success', Delivered: 'success',
  cancelled: 'destructive', Cancelled: 'destructive',
};

async function fetchOrders(workspace: string, filters: { status?: string; page?: number }) {
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
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function OrdersPage({ params, searchParams }: PageProps) {
  const { workspace } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const { status, page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? '1') || 1;

  const { orders, total } = await fetchOrders(workspace, { status, page });
  const statuses = workspace === 'shudhham' ? SHUDHHAM_STATUSES : BUILDKART_STATUSES;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Orders" description={`${ws.name} · ${total} total`} />

      {/* Quick status filter */}
      <div className="flex flex-wrap gap-2">
        <a href="?" className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${!status ? 'bg-foreground text-background' : 'hover:bg-muted/50'}`}>
          All
        </a>
        {statuses.map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${status === s ? 'bg-foreground text-background' : 'hover:bg-muted/50'}`}
          >
            {s}
          </a>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>{workspace === 'shudhham' ? 'Customer' : 'User'}</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const rec = o as unknown as Record<string, unknown>;
                const amount = (rec.total_amount ?? rec.total ?? 0) as number;
                const customerName = (rec.full_name ?? '—') as string;
                return (
                  <TableRow key={rec.id as string}>
                    <TableCell className="font-mono text-xs font-semibold">{(rec.id as string).slice(0, 8)}…</TableCell>
                    <TableCell className="text-sm">{customerName}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(amount)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[rec.status as string] ?? 'secondary'} className="capitalize">
                        {rec.status as string}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(rec.created_at as string)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination links */}
      {total > 30 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {Math.ceil(total / 30)}</span>
          <div className="flex gap-2">
            {page > 1 && <a href={`?page=${page - 1}${status ? `&status=${status}` : ''}`} className="px-3 py-1.5 border rounded-lg hover:bg-muted/50">← Prev</a>}
            {page < Math.ceil(total / 30) && <a href={`?page=${page + 1}${status ? `&status=${status}` : ''}`} className="px-3 py-1.5 border rounded-lg hover:bg-muted/50">Next →</a>}
          </div>
        </div>
      )}
    </div>
  );
}
