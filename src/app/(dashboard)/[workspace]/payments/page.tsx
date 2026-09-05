import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

async function fetchPayments(workspace: string, page: number) {
  if (workspace === 'houserve') {
    const { getHouservePayments } = await import('@/integrations/houserve/queries');
    return getHouservePayments(page);
  }
  if (workspace === 'shudhham') {
    const { getShudhhamPayments } = await import('@/integrations/shudhham/queries');
    return getShudhhamPayments(page);
  }
  if (workspace === 'buildkart') {
    const { getBuildKartPayments } = await import('@/integrations/buildkart/queries');
    return getBuildKartPayments(page);
  }
  return { payments: [], total: 0 };
}

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function PaymentsPage({ params, searchParams }: PageProps) {
  const { workspace } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const { page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? '1') || 1;

  const { payments, total } = await fetchPayments(workspace, page);

  // Compute summary
  const paid = payments.filter((p) => p.payment_status === 'paid');
  const totalRevenue = paid.reduce((s, p) => s + (p.total_amount ?? 0), 0);

  const isHouserve = workspace === 'houserve';
  const isShudhham = workspace === 'shudhham';

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Payments"
        description={`${ws.name} · ${total} records · ${formatCurrency(totalRevenue)} collected`}
      />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isShudhham ? 'Stripe Payment ID' : 'Razorpay Payment ID'}</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No payments yet
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {/* booking_ref for Houserve, order id for others */}
                    {(p as unknown as Record<string, unknown>).booking_ref as string
                      ?? (p as unknown as Record<string, unknown>).order_ref as string
                      ?? p.id.slice(0, 8) + '…'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{p.customer?.full_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{p.customer?.email ?? ''}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(p.total_amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.payment_status === 'paid' ? 'success'
                        : p.payment_status === 'failed' ? 'destructive'
                        : 'warning'
                      }
                      className="capitalize"
                    >
                      {p.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                    {(p as unknown as Record<string, unknown>).razorpay_payment_id as string
                      ?? (p as unknown as Record<string, unknown>).stripe_payment_intent_id as string
                      ?? (p as unknown as Record<string, unknown>).payment_id as string
                      ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(p.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
