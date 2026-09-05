'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/export-csv';
import { EmptyState } from '@/components/ui/empty-state';
import { CreditCard, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface PaymentItem {
  id: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  customer: { full_name: string | null; email: string | null } | null;
  booking_ref?: string;
  payment_id?: string | null;
  razorpay_payment_id?: string | null;
  stripe_payment_intent_id?: string | null;
}

interface PaymentsTableProps {
  workspace: string;
  payments: PaymentItem[];
  total: number;
  totalRevenue: number;
  currentPage: number;
  currentSearch: string;
}

const PAGE_SIZE = 30;

export function PaymentsTable({
  workspace,
  payments,
  total,
  totalRevenue,
  currentPage,
  currentSearch,
}: PaymentsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const isHouserve = workspace === 'houserve';
  const isShudhham = workspace === 'shudhham';

  return (
    <>
      {/* Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search ref or payment ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('q', searchInput);
            }}
            className="pl-9"
          />
        </div>

        <span className="text-sm text-muted-foreground ml-auto">
          {total} record{total !== 1 ? 's' : ''} · <strong className="text-foreground">{formatCurrency(totalRevenue)}</strong> collected
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const headers = ['Transaction ID', 'Customer', 'Amount', 'Status', 'Gateway Payment ID', 'Date'];
            const rows = payments.map((p) => [
              p.booking_ref || p.id,
              p.customer?.full_name || '—',
              p.total_amount,
              p.payment_status,
              p.stripe_payment_intent_id || p.razorpay_payment_id || p.payment_id || '—',
              formatDate(p.created_at),
            ]);
            exportToCsv(`${workspace}_payments`, headers, rows);
            toast({ title: 'Export Complete', description: `Exported ${rows.length} transactions to CSV.`, variant: 'success' });
          }}
          className="gap-1.5"
          disabled={payments.length === 0}
          aria-label="Export payments as CSV"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
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
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={CreditCard}
                    title="No payments found"
                    description={currentSearch ? `No payment transactions matching "${currentSearch}"` : 'No payment records found in this workspace.'}
                  />
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => {
                const ref =
                  p.booking_ref ||
                  (p as unknown as Record<string, unknown>).order_ref as string ||
                  p.id.slice(0, 8) + '…';

                const gatewayId =
                  p.razorpay_payment_id ||
                  p.stripe_payment_intent_id ||
                  p.payment_id ||
                  '—';

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-semibold">{ref}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{p.customer?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{p.customer?.email ?? ''}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(p.total_amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.payment_status === 'paid' || p.payment_status === 'completed'
                            ? 'success'
                            : p.payment_status === 'failed'
                            ? 'destructive'
                            : 'warning'
                        }
                        className="capitalize"
                      >
                        {p.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                      {gatewayId}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setParam('page', String(currentPage - 1))}
              disabled={currentPage <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setParam('page', String(currentPage + 1))}
              disabled={currentPage >= totalPages || isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
