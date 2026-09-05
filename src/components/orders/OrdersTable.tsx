'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/export-csv';
import { EmptyState } from '@/components/ui/empty-state';
import { updateShudhhamOrderStatus } from '@/integrations/shudhham/actions';
import { updateBuildKartOrderStatus } from '@/integrations/buildkart/actions';
import type { ShudhhamOrder } from '@/integrations/shudhham/queries';
import type { BuildKartOrder } from '@/integrations/buildkart/queries';
import { ChevronLeft, ChevronRight, Search, Eye, MapPin, ShoppingBag, CreditCard, Download } from 'lucide-react';

const SHUDHHAM_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'] as const;
const BUILDKART_STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'info' | 'destructive' | 'secondary'> = {
  processing: 'warning',
  Processing: 'warning',
  shipped: 'info',
  Shipped: 'info',
  delivered: 'success',
  Delivered: 'success',
  cancelled: 'destructive',
  Cancelled: 'destructive',
};

interface OrdersTableProps {
  workspace: 'shudhham' | 'buildkart';
  orders: (ShudhhamOrder | BuildKartOrder)[];
  total: number;
  currentPage: number;
  currentStatus: string;
  currentSearch: string;
}

const PAGE_SIZE = 30;

export function OrdersTable({
  workspace,
  orders,
  total,
  currentPage,
  currentStatus,
  currentSearch,
}: OrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const statuses = workspace === 'shudhham' ? SHUDHHAM_STATUSES : BUILDKART_STATUSES;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '' || value === 'all') params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleStatusChange(orderId: string, newStatus: string) {
    startTransition(async () => {
      const result =
        workspace === 'shudhham'
          ? await updateShudhhamOrderStatus(orderId, newStatus)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : await updateBuildKartOrderStatus(orderId, newStatus as any);

      if (result && 'error' in result && result.error) {
        toast({
          title: 'Status Update Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Status Updated',
        description: `Order status changed to ${newStatus}`,
        variant: 'success',
      });
      router.refresh();
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search order ID, customer…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('q', searchInput);
            }}
            className="pl-9"
          />
        </div>

        <Select value={currentStatus || 'all'} onValueChange={(v) => setParam('status', v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {total} order{total !== 1 ? 's' : ''}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const headers = ['Order Ref / ID', 'Customer Name', 'Items Count', 'Total Amount', 'Status', 'Date'];
            const rows: (string | number | null | undefined)[][] = orders.map((o) => {
              const ref: string = 'order_ref' in o ? String(o.order_ref || o.id) : String(o.id);
              const customer: string = 'customer_name' in o ? String(o.customer_name || '—') : '—';
              const items: number = 'items_count' in o ? Number(o.items_count) : 1;
              const amount: number = 'total_amount' in o ? Number(o.total_amount) : Number((o as { total: number }).total ?? 0);
              const status: string = String(o.status ?? '');
              const date: string = formatDate(o.created_at);
              return [ref, customer, items, amount, status, date];
            });
            exportToCsv(`${workspace}_orders`, headers, rows);
            toast({ title: 'Export Complete', description: `Exported ${rows.length} orders to CSV.`, variant: 'success' });
          }}
          className="gap-1.5"
          disabled={orders.length === 0}
          aria-label="Export orders as CSV"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={ShoppingBag}
                    title="No orders found"
                    description={currentSearch ? `No orders matching "${currentSearch}"` : 'No orders placed yet in this workspace.'}
                  />
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rec = o as any;
                const customerName = rec.customer?.full_name || rec.full_name || 'Customer';
                const itemsCount = rec.items?.length || 0;

                return (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <button
                        onClick={() => setDetailOrder(rec)}
                        className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1 text-left"
                      >
                        {rec.id.slice(0, 8)}…
                        <Eye className="h-3 w-3 opacity-60" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{customerName}</div>
                      {rec.customer?.email && (
                        <div className="text-xs text-muted-foreground">{rec.customer.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {itemsCount > 0 ? `${itemsCount} item${itemsCount > 1 ? 's' : ''}` : '1 item'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(rec.total_amount ?? rec.total ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[rec.status] ?? 'secondary'} className="capitalize">
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(rec.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Select
                          value={rec.status}
                          onValueChange={(val) => handleStatusChange(rec.id, val)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setDetailOrder(rec)}
                          title="View order details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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

      {/* Order Detail Modal */}
      <Dialog open={detailOrder !== null} onOpenChange={(open) => { if (!open) setDetailOrder(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="font-mono text-base">
                    Order #{detailOrder.id}
                  </DialogTitle>
                  <Badge variant={STATUS_VARIANTS[detailOrder.status] ?? 'secondary'} className="capitalize">
                    {detailOrder.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-muted/40 rounded-xl text-sm border">
                  <div>
                    <span className="text-xs text-muted-foreground block">Customer</span>
                    <strong className="text-foreground">
                      {detailOrder.customer?.full_name || detailOrder.full_name || 'Customer'}
                    </strong>
                    <div className="text-xs text-muted-foreground">
                      {detailOrder.customer?.phone || detailOrder.address?.phone || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Order Date</span>
                    <strong className="text-foreground">{formatDate(detailOrder.created_at)}</strong>
                    <div className="text-xs text-muted-foreground">
                      {new Date(detailOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Payment</span>
                    <strong className="text-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      {detailOrder.payment_method || 'Online'}
                    </strong>
                    {detailOrder.payment_id && (
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                        {detailOrder.payment_id}
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="border rounded-xl p-3.5 bg-card">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5" /> Shipping Address
                  </div>
                  {workspace === 'shudhham' ? (
                    <p className="text-sm font-medium">
                      {[
                        detailOrder.address,
                        detailOrder.city,
                        detailOrder.state,
                        detailOrder.pin_code,
                      ].filter(Boolean).join(', ') || 'Address not recorded'}
                    </p>
                  ) : (
                    <div>
                      {detailOrder.address ? (
                        <>
                          <div className="text-sm font-medium">
                            {[
                              detailOrder.address.line1,
                              detailOrder.address.line2,
                              detailOrder.address.city,
                              detailOrder.address.state,
                              detailOrder.address.pincode,
                            ].filter(Boolean).join(', ')}
                          </div>
                          {detailOrder.address.name && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Recipient: {detailOrder.address.name} ({detailOrder.address.phone ?? ''})
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No address blob recorded</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Order Items Table */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-3.5 py-2.5 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ordered Products & Quantities
                    </span>
                    <span className="text-xs font-medium">
                      {detailOrder.items?.length || 0} item(s)
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailOrder.items && detailOrder.items.length > 0 ? (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        detailOrder.items.map((item: any, idx: number) => {
                          const itemName = item.product_name || item.name || 'Product';
                          const qty = item.quantity || 1;
                          const price = Number(item.price) || 0;
                          const total = price * qty;

                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  {item.image && (
                                    <div className="relative h-8 w-8 rounded overflow-hidden border shrink-0 bg-muted">
                                      <Image
                                        src={item.image}
                                        alt={itemName}
                                        width={32}
                                        height={32}
                                        className="object-cover h-full w-full"
                                        unoptimized
                                      />
                                    </div>
                                  )}
                                  <span className="font-medium text-sm">{itemName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-sm">{qty}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(price)}</TableCell>
                              <TableCell className="text-right text-sm font-semibold">{formatCurrency(total)}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-sm text-muted-foreground">
                            No individual line items recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <div className="bg-muted/20 p-3.5 border-t flex justify-between items-center text-sm">
                    <span className="font-bold">Total Amount</span>
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(detailOrder.total_amount ?? detailOrder.total ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOrder(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
