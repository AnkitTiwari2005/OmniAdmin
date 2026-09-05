// ============================================================
// src/integrations/houserve/queries.ts — server-only
// All list/detail functions for Houserve pages
// ============================================================

import { getHouserveClient } from '@/lib/supabase/houserve';
import type {
  HouserveBookingFull,
  HouserveService,
  HouserveTechnician,
  HouserveCustomer,
  HouservePayment,
  HouserveKPIs,
  HouserveRecentBooking,
} from './types';

// ── Re-export plain interfaces needed by dashboard ────────────
export type { HouserveKPIs, HouserveRecentBooking };

// ── Dashboard KPIs ───────────────────────────────────────────

export async function getHouserveDashboardKPIs(): Promise<HouserveKPIs> {
  const db = getHouserveClient();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [bookingsToday, revenueThisWeek, revenuePrevWeek, totalCustomers, pendingBookings, activeBookings] =
    await Promise.all([
      db.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      db.from('bookings').select('id, total_amount').gte('created_at', weekAgo.toISOString()).eq('payment_status', 'paid'),
      db.from('bookings').select('id, total_amount').gte('created_at', prevWeekStart.toISOString()).lt('created_at', weekAgo.toISOString()).eq('payment_status', 'paid'),
      db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      db.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      db.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['assigned', 'accepted', 'on_the_way', 'in_progress']),
    ]);

  const thisWeekRev = ((revenueThisWeek.data ?? []) as Array<{ total_amount: number }>).reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const prevWeekRev = ((revenuePrevWeek.data ?? []) as Array<{ total_amount: number }>).reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const revenueTrend = prevWeekRev === 0 ? 0 : ((thisWeekRev - prevWeekRev) / prevWeekRev) * 100;

  return {
    bookingsToday: bookingsToday.count ?? 0,
    revenueThisWeek: thisWeekRev,
    revenueTrend: Math.round(revenueTrend),
    totalCustomers: totalCustomers.count ?? 0,
    pendingBookings: pendingBookings.count ?? 0,
    activeBookings: activeBookings.count ?? 0,
  };
}

export async function getHouserveRecentBookings(limit = 5): Promise<HouserveRecentBooking[]> {
  const db = getHouserveClient();
  const { data, error } = await db
    .from('bookings')
    .select('id, booking_ref, total_amount, status, payment_status, scheduled_date, customer_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HouserveRecentBooking[];
}

// ── 7-day chart data ─────────────────────────────────────────

export async function getHouserveWeeklyChart(): Promise<Array<{ date: string; bookings: number; revenue: number }>> {
  const db = getHouserveClient();
  const days: Array<{ date: string; bookings: number; revenue: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);

    const [cnt, rev] = await Promise.all([
      db.from('bookings').select('*', { count: 'exact', head: true })
        .gte('created_at', d.toISOString()).lte('created_at', end.toISOString()),
      db.from('bookings').select('id, total_amount')
        .gte('created_at', d.toISOString()).lte('created_at', end.toISOString()).eq('payment_status', 'paid'),
    ]);

    days.push({
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      bookings: cnt.count ?? 0,
      revenue: ((rev.data ?? []) as Array<{ total_amount: number }>).reduce((s, b) => s + (b.total_amount ?? 0), 0),
    });
  }
  return days;
}

// ── Bookings list ─────────────────────────────────────────────

export interface BookingFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getHouserveBookings(filters: BookingFilters = {}): Promise<{
  bookings: HouserveBookingFull[];
  total: number;
}> {
  const db = getHouserveClient();
  const { status, search, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('bookings')
    .select(
      'id, booking_ref, customer_id, service_id, technician_id, status, scheduled_date, scheduled_time, address_snapshot, special_instructions, subtotal, platform_fee, gst_amount, total_amount, razorpay_order_id, razorpay_payment_id, payment_status, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const bookingIds = (data ?? []).map((b) => (b as Record<string, unknown>).id as string);

  // Batch-load related data
  const [profilesRes, servicesRes, techniciansRes] = await Promise.all([
    db.from('profiles').select('id, full_name, email, phone').in('id', (data ?? []).map((b) => (b as Record<string, unknown>).customer_id as string).filter(Boolean)),
    db.from('services').select('id, name, category').in('id', (data ?? []).map((b) => (b as Record<string, unknown>).service_id as string).filter(Boolean)),
    db.from('profiles').select('id, full_name, phone').in('id', (data ?? []).map((b) => (b as Record<string, unknown>).technician_id as string).filter(Boolean)),
  ]);

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map((p) => [(p as Record<string, unknown>).id as string, p]));
  const serviceMap = Object.fromEntries((servicesRes.data ?? []).map((s) => [(s as Record<string, unknown>).id as string, s]));
  const techMap = Object.fromEntries((techniciansRes.data ?? []).map((t) => [(t as Record<string, unknown>).id as string, t]));

  const bookings = ((data ?? []) as Array<Record<string, unknown>>).map((b) => ({
    ...b,
    customer: profileMap[b.customer_id as string] ?? null,
    service: serviceMap[b.service_id as string] ?? null,
    technician: techMap[b.technician_id as string] ?? null,
    booking_items: [],
  })) as unknown as HouserveBookingFull[];

  // Filter by search client-side (on the already fetched page)
  const filtered = search
    ? bookings.filter((b) =>
        b.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
        b.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.customer?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  return { bookings: filtered, total: count ?? 0 };
}

// ── Services ─────────────────────────────────────────────────

export async function getHouserveServices(): Promise<HouserveService[]> {
  const db = getHouserveClient();
  const { data, error } = await db
    .from('services')
    .select('id, name, category, description, price, duration_minutes, image_url, is_active, sort_order, created_at')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HouserveService[];
}

// ── Technicians ───────────────────────────────────────────────

export async function getHouserveTechnicians(): Promise<HouserveTechnician[]> {
  const db = getHouserveClient();
  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url')
    .eq('role', 'technician')
    .order('full_name', { ascending: true });
  if (error) throw error;

  // Count active bookings per technician
  const techIds = (data ?? []).map((t) => (t as Record<string, unknown>).id as string);
  if (techIds.length === 0) return [];

  const { data: activeBookings } = await db
    .from('bookings')
    .select('technician_id')
    .in('status', ['assigned', 'accepted', 'on_the_way', 'in_progress'])
    .in('technician_id', techIds);

  const activeCountMap: Record<string, number> = {};
  (activeBookings ?? []).forEach((b) => {
    const tid = (b as Record<string, unknown>).technician_id as string;
    if (tid) activeCountMap[tid] = (activeCountMap[tid] ?? 0) + 1;
  });

  return ((data ?? []) as Array<Record<string, unknown>>).map((t) => ({
    ...t,
    active_bookings: activeCountMap[t.id as string] ?? 0,
  })) as HouserveTechnician[];
}

// ── Customers ─────────────────────────────────────────────────

export async function getHouserveCustomers(page = 1, limit = 30): Promise<{ customers: HouserveCustomer[]; total: number }> {
  const db = getHouserveClient();
  const offset = (page - 1) * limit;

  const { data, count, error } = await db
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, razorpay_customer_id, created_at', { count: 'exact' })
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { customers: (data ?? []) as HouserveCustomer[], total: count ?? 0 };
}

// ── Payments ──────────────────────────────────────────────────

export async function getHouservePayments(page = 1, limit = 30): Promise<{ payments: HouservePayment[]; total: number }> {
  const db = getHouserveClient();
  const offset = (page - 1) * limit;

  const { data, count, error } = await db
    .from('bookings')
    .select('id, booking_ref, customer_id, total_amount, subtotal, platform_fee, gst_amount, razorpay_order_id, razorpay_payment_id, payment_status, scheduled_date, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const custIds = (data ?? []).map((b) => (b as Record<string, unknown>).customer_id as string).filter(Boolean);
  const { data: profiles } = await db.from('profiles').select('id, full_name, email').in('id', custIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [(p as Record<string, unknown>).id as string, p]));

  const payments = ((data ?? []) as Array<Record<string, unknown>>).map((b) => ({
    ...b,
    customer: profileMap[b.customer_id as string] ?? null,
  })) as unknown as HouservePayment[];

  return { payments, total: count ?? 0 };
}
