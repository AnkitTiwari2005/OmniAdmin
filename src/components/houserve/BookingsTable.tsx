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
import {
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TRANSITIONS,
  type HouserveBookingFull,
  type HouserveTechnician,
  type BookingStatus,
} from '@/integrations/houserve/types';
import { updateBookingStatus, assignTechnicianToBooking } from '@/integrations/houserve/actions';
import { ChevronLeft, ChevronRight, Search, UserCheck, Eye, MapPin, Calendar, CreditCard, Wrench } from 'lucide-react';

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
  bookings,
  total,
  technicians,
  currentPage,
  currentStatus,
  currentSearch,
}: BookingsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedBooking, setSelectedBooking] = useState<HouserveBookingFull | null>(null);
  const [detailBooking, setDetailBooking] = useState<HouserveBookingFull | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '' || value === 'all') params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleStatusUpdate(bookingId: string, newStatus: BookingStatus) {
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, newStatus);
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
        description: `Booking ref moved to ${BOOKING_STATUS_LABELS[newStatus]}`,
        variant: 'success',
      });
      router.refresh();
    });
  }

  function handleAssignTechnician(techId: string) {
    if (!selectedBooking) return;
    startTransition(async () => {
      const result = await assignTechnicianToBooking(selectedBooking.id, techId);
      if (result && 'error' in result && result.error) {
        toast({
          title: 'Assignment Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Technician Assigned',
        description: 'Assigned technician to booking',
        variant: 'success',
      });
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
            placeholder="Search ref (e.g. BW-)..."
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
            {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {total} booking{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Primary Service</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
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
                const itemsCount = b.booking_items?.length ?? 0;

                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <button
                        onClick={() => setDetailBooking(b)}
                        className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1 text-left"
                      >
                        {b.booking_ref}
                        <Eye className="h-3 w-3 opacity-60" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{b.customer?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{b.customer?.phone ?? b.customer?.email ?? ''}</div>
                    </TableCell>
                    <TableCell className="text-sm">{b.service?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {itemsCount > 0 ? `${itemsCount} item${itemsCount > 1 ? 's' : ''}` : '1 item'}
                      </Badge>
                    </TableCell>
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
                    <TableCell className="text-sm">
                      {b.technician ? (
                        <div className="text-xs font-medium">{b.technician.full_name ?? '—'}</div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setSelectedBooking(b);
                            setAssignOpen(true);
                          }}
                          disabled={b.status === 'completed' || b.status === 'cancelled' || isPending}
                        >
                          <UserCheck className="h-3 w-3" />
                          Assign
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {nextStatuses.length > 0 && (
                          <Select
                            onValueChange={(v) => handleStatusUpdate(b.id, v as BookingStatus)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue placeholder="Move to…" />
                            </SelectTrigger>
                            <SelectContent>
                              {nextStatuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {BOOKING_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setDetailBooking(b)}
                          title="View booking details"
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

      {/* Booking Detail Dialog */}
      <Dialog open={detailBooking !== null} onOpenChange={(open) => { if (!open) setDetailBooking(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailBooking && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="flex items-center gap-2 font-mono">
                    {detailBooking.booking_ref}
                  </DialogTitle>
                  <Badge variant={BOOKING_STATUS_COLORS[detailBooking.status]}>
                    {BOOKING_STATUS_LABELS[detailBooking.status]}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex flex-col gap-5 py-2">
                {/* Top Meta info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-muted/40 rounded-xl text-sm border">
                  <div>
                    <span className="text-xs text-muted-foreground block">Customer</span>
                    <strong className="text-foreground">{detailBooking.customer?.full_name ?? '—'}</strong>
                    <div className="text-xs text-muted-foreground">{detailBooking.customer?.phone ?? detailBooking.customer?.email ?? '—'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Technician</span>
                    <strong className="text-foreground">{detailBooking.technician?.full_name ?? 'Not Assigned'}</strong>
                    <div className="text-xs text-muted-foreground">{detailBooking.technician?.phone ?? '—'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Scheduled</span>
                    <strong className="text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(detailBooking.scheduled_date)}
                    </strong>
                    <div className="text-xs text-muted-foreground">{detailBooking.scheduled_time?.slice(0, 5) ?? 'Anytime'}</div>
                  </div>
                </div>

                {/* Address Snapshot */}
                {detailBooking.address_snapshot && (
                  <div className="border rounded-xl p-3.5 bg-card">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                      <MapPin className="h-3.5 w-3.5" /> Service Address
                    </div>
                    <p className="text-sm font-medium">
                      {detailBooking.address_snapshot.full_address ||
                        [
                          detailBooking.address_snapshot.flat_number,
                          detailBooking.address_snapshot.street,
                          detailBooking.address_snapshot.city,
                          detailBooking.address_snapshot.pincode,
                        ].filter(Boolean).join(', ')}
                    </p>
                    {detailBooking.address_snapshot.phone && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Contact Phone: {detailBooking.address_snapshot.phone}
                      </p>
                    )}
                  </div>
                )}

                {/* Real Line Items Table */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-3.5 py-2.5 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5" /> Booking Services & Items
                    </span>
                    <span className="text-xs font-medium">
                      {detailBooking.booking_items?.length || 1} line item(s)
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailBooking.booking_items && detailBooking.booking_items.length > 0 ? (
                        detailBooking.booking_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm">
                              {item.service?.name ?? detailBooking.service?.name ?? 'Service'}
                            </TableCell>
                            <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{formatCurrency(item.total_price)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="font-medium text-sm">
                            {detailBooking.service?.name ?? 'Standard Service'}
                          </TableCell>
                          <TableCell className="text-center text-sm">1</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(detailBooking.subtotal)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{formatCurrency(detailBooking.subtotal)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Financial Breakdown */}
                  <div className="bg-muted/20 p-3.5 border-t flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>Subtotal</span>
                      <span>{formatCurrency(detailBooking.subtotal)}</span>
                    </div>
                    {detailBooking.platform_fee ? (
                      <div className="flex justify-between text-muted-foreground text-xs">
                        <span>Platform Fee</span>
                        <span>{formatCurrency(detailBooking.platform_fee)}</span>
                      </div>
                    ) : null}
                    {detailBooking.gst_amount ? (
                      <div className="flex justify-between text-muted-foreground text-xs">
                        <span>GST / Taxes</span>
                        <span>{formatCurrency(detailBooking.gst_amount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-bold text-base border-t pt-1.5 mt-1">
                      <span>Total Amount</span>
                      <span className="text-primary">{formatCurrency(detailBooking.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Special Instructions */}
                {detailBooking.special_instructions && (
                  <div className="border rounded-xl p-3 bg-muted/20 text-xs">
                    <strong className="block text-muted-foreground mb-1">Customer Notes:</strong>
                    <p className="text-foreground italic">{detailBooking.special_instructions}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailBooking(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
