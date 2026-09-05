'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, BOOKING_STATUS_TRANSITIONS,
  type HouserveBookingFull, type HouserveTechnician, type BookingStatus,
} from '@/integrations/houserve/types';
import { updateBookingStatus, assignTechnicianToBooking } from '@/integrations/houserve/actions';
import { ChevronLeft, ChevronRight, Search, UserCheck, RefreshCw } from 'lucide-react';

interface BookingsTableProps {
  bookings: HouserveBookingFull[];
  total: number;
  technicians: HouserveTechnician[];
  currentPage: number;
  currentStatus: string;
  currentSearch: string;
}

const PAGE_SIZE = 20;

export function BookingsTable({
  bookings, total, technicians, currentPage, currentStatus, currentSearch,
}: BookingsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedBooking, setSelectedBooking] = useState<HouserveBookingFull | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '' || value === 'all') params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleStatusUpdate(bookingId: string, newStatus: BookingStatus) {
    startTransition(async () => {
      await updateBookingStatus(bookingId, newStatus);
      router.refresh();
    });
  }

  function handleAssignTechnician(techId: string) {
    if (!selectedBooking) return;
    startTransition(async () => {
      await assignTechnicianToBooking(selectedBooking.id, techId);
      setAssignOpen(false);
      setSelectedBooking(null);
      router.refresh();
    });
  }

  return (
    <>
      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search ref, customer…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setParam('q', searchInput); }}
            className="pl-9"
          />
        </div>

        <Select value={currentStatus || 'all'} onValueChange={(v) => setParam('status', v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {total} booking{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => {
                const nextStatuses = BOOKING_STATUS_TRANSITIONS[b.status];
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-semibold">{b.booking_ref}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{b.customer?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{b.customer?.email ?? ''}</div>
                    </TableCell>
                    <TableCell className="text-sm">{b.service?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(b.scheduled_date)}
                      {b.scheduled_time && <span className="ml-1">{b.scheduled_time.slice(0, 5)}</span>}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(b.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={BOOKING_STATUS_COLORS[b.status]}>
                        {BOOKING_STATUS_LABELS[b.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.payment_status === 'paid' ? 'success' : b.payment_status === 'failed' ? 'destructive' : 'warning'} className="capitalize">
                        {b.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.technician ? (
                        <span>{b.technician.full_name ?? '—'}</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => { setSelectedBooking(b); setAssignOpen(true); }}
                          disabled={b.status === 'completed' || b.status === 'cancelled'}
                        >
                          <UserCheck className="h-3 w-3" />
                          Assign
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {nextStatuses.length > 0 && (
                        <Select
                          onValueChange={(v) => handleStatusUpdate(b.id, v as BookingStatus)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue placeholder="Move to…" />
                          </SelectTrigger>
                          <SelectContent>
                            {nextStatuses.map((s) => (
                              <SelectItem key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
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
              size="sm" variant="outline"
              onClick={() => setParam('page', String(currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => setParam('page', String(currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Assign Technician Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">
            Booking: <span className="font-mono font-semibold text-foreground">{selectedBooking?.booking_ref}</span>
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {technicians.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No technicians available</p>
            ) : (
              technicians.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAssignTechnician(t.id)}
                  disabled={isPending}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div>
                    <div className="font-medium text-sm">{t.full_name ?? 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{t.phone ?? t.email ?? '—'}</div>
                  </div>
                  <Badge variant={t.active_bookings ? 'warning' : 'success'} className="text-xs">
                    {t.active_bookings ?? 0} active
                  </Badge>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-lg text-sm">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Saving…
        </div>
      )}
    </>
  );
}
