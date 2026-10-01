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

// ── 7-day chart data (Optimized: 1 query instead of 14) ─────

export async function getHouserveWeeklyChart(): Promise<Array<{ date: string; bookings: number; revenue: number }>> {
  const db = getHouserveClient();
  const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await db
    .from('bookings')
    .select('id, total_amount, payment_status, created_at')
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const dayBuckets: Record<string, { label: string; bookings: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = {
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      bookings: 0,
      revenue: 0,
    };
  }

  ((data ?? []) as any[]).forEach((row) => {
    const dayKey = row.created_at ? row.created_at.slice(0, 10) : '';
    if (dayBuckets[dayKey]) {
      dayBuckets[dayKey].bookings += 1;
      if (row.payment_status === 'paid') {
        dayBuckets[dayKey].revenue += Number(row.total_amount) || 0;
      }
    }
  });

  return Object.values(dayBuckets).map((b) => ({
    date: b.label,
    bookings: b.bookings,
    revenue: b.revenue,
  }));
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

  // Single query embedding service and real booking line items
  let query = db
    .from('bookings')
    .select(
      'id, booking_ref, customer_id, service_id, technician_id, status, scheduled_date, scheduled_time, address_snapshot, special_instructions, subtotal, platform_fee, gst_amount, total_amount, razorpay_order_id, razorpay_payment_id, payment_status, created_at, service:services(id, name, category), booking_items(id, service_id, quantity, unit_price, total_price, service:services(id, name))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status);
  }

  if (search) {
    query = query.ilike('booking_ref', `%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  // Batch query customer and technician profiles in 1 call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = (data ?? []) as Array<any>;
  const profileIds = Array.from(
    new Set(rawData.flatMap((b) => [b.customer_id, b.technician_id]).filter(Boolean))
  );

  const { data: profiles } = profileIds.length
    ? await db.from('profiles').select('id, full_name, email, phone').in('id', profileIds)
    : { data: [] };

  const profileMap = Object.fromEntries(
    ((profiles ?? []) as any[]).map((p: any) => [p.id, p])
  );

  const bookings: HouserveBookingFull[] = rawData.map((b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (b.booking_items ?? []).map((bi: any) => ({
      id: bi.id,
      service_id: bi.service_id,
      quantity: Number(bi.quantity) || 1,
      unit_price: Number(bi.unit_price) || 0,
      total_price: Number(bi.total_price) || 0,
      service: bi.service ? { name: bi.service.name } : null,
    }));

    return {
      ...b,
      customer: profileMap[b.customer_id] ?? null,
      technician: profileMap[b.technician_id] ?? null,
      service: b.service ?? null,
      booking_items: items,
    } as HouserveBookingFull;
  });

  return { bookings, total: count ?? 0 };
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

// ── Promotions ───────────────────────────────────────────────

export async function getHouservePromotions(): Promise<import('./types').HouservePromotion[]> {
  const db = getHouserveClient();
  const { data, error } = await db
    .from('promotions')
    .select('id, title, subtitle, cta_text, bg_gradient, link_path, is_active, sort_order, created_at, image_url')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as import('./types').HouservePromotion[];
}

// ── Technicians ───────────────────────────────────────────────

export async function getHouserveTechnicians(): Promise<HouserveTechnician[]> {
  const db = getHouserveClient();

  // 1. Fetch profiles and technician_profiles in parallel
  const [profilesRes, techProfilesRes] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, email, phone, avatar_url, created_at, role')
      .in('role', ['technician', 'technician_inactive'])
      .order('full_name', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('technician_profiles')
      .select('*')
  ]);

  if (profilesRes.error) throw profilesRes.error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = (profilesRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const techProfiles = (techProfilesRes.data ?? []) as any[];

  // Map technician_profiles by id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const techMap = new Map<string, any>();
  techProfiles.forEach((tp) => techMap.set(tp.id, tp));

  // Also include any technician_profiles whose profile role is still transitioning
  const existingIds = new Set(profiles.map((p) => p.id));
  const missingIds = techProfiles.map((tp) => tp.id).filter((id) => !existingIds.has(id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let extraProfiles: any[] = [];
  if (missingIds.length > 0) {
    const { data: extras } = await db
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url, created_at, role')
      .in('id', missingIds);
    extraProfiles = extras ?? [];
  }

  const allProfiles = [...profiles, ...extraProfiles];
  const techIds = allProfiles.map((t) => t.id);
  if (techIds.length === 0) return [];

  // 2. Count active bookings per technician
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

  return allProfiles.map((p) => {
    const tp = techMap.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      avatar_url: p.avatar_url,
      role: p.role,
      created_at: p.created_at,
      is_active: p.role !== 'technician_inactive',
      active_bookings: activeCountMap[p.id] ?? 0,
      skills: tp?.skills ?? [],
      experience_years: tp?.experience_years ?? 0,
      id_type: tp?.id_type ?? null,
      id_number: tp?.id_number ?? null,
      id_document_url: tp?.id_document_url ?? null,
      verification_status: tp?.verification_status ?? (p.role === 'technician' ? 'approved' : 'pending'),
      rejection_reason: tp?.rejection_reason ?? null,
      is_online: Boolean(tp?.is_online),
      wallet_balance: Number(tp?.wallet_balance ?? 0),
      bank_upi_id: tp?.bank_upi_id ?? null,
      total_completed_jobs: tp?.total_completed_jobs ?? 0,
      rating: Number(tp?.rating ?? 5),
    };
  }) as HouserveTechnician[];
}

export async function getHouservePayouts(): Promise<import('./types').HouserveTechnicianPayout[]> {
  const db = getHouserveClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('technician_payouts')
    .select('id, technician_id, booking_id, type, amount, status, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const techIds = Array.from(new Set(data.map((p: any) => p.technician_id))) as string[];
  if (techIds.length === 0) return [];

  const [{ data: techData }, { data: techProfiles }] = await Promise.all([
    db.from('profiles').select('id, full_name, phone').in('id', techIds),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from('technician_profiles').select('id, bank_upi_id').in('id', techIds),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameMap = Object.fromEntries(((techData ?? []) as any[]).map((t) => [t.id, t]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upiMap = Object.fromEntries(((techProfiles ?? []) as any[]).map((t) => [t.id, t.bank_upi_id]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((p: any) => ({
    ...p,
    technician: {
      full_name: nameMap[p.technician_id]?.full_name ?? 'Technician',
      phone: nameMap[p.technician_id]?.phone ?? null,
      bank_upi_id: upiMap[p.technician_id] ?? null,
    },
  })) as import('./types').HouserveTechnicianPayout[];
}

export async function getHouservePromotableCustomers(
  search = ''
): Promise<Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }>> {
  const db = getHouserveClient();
  let query = db
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('role', 'customer')
    .order('full_name', { ascending: true })
    .limit(20);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }>;
}

// ── Customers ─────────────────────────────────────────────────

export async function getHouserveCustomers(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<{ customers: HouserveCustomer[]; total: number }> {
  const db = getHouserveClient();
  const { search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, created_at', { count: 'exact' })
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const rawCustomers = (data ?? []) as any[];
  const customers = rawCustomers.map((p) => ({
    id: p.id,
    full_name: p.full_name ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    avatar_url: p.avatar_url ?? null,
    razorpay_customer_id: null,
    created_at: p.created_at,
  }));
  return { customers, total: count ?? 0 };
}

// ── Payments ──────────────────────────────────────────────────

export async function getHouservePayments(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<{ payments: HouservePayment[]; total: number }> {
  const db = getHouserveClient();
  const { search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('bookings')
    .select(
      'id, booking_ref, customer_id, total_amount, subtotal, platform_fee, gst_amount, razorpay_order_id, razorpay_payment_id, payment_status, scheduled_date, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`booking_ref.ilike.%${search}%,razorpay_payment_id.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const rawPayments = (data ?? []) as any[];
  const custIds = Array.from(new Set(rawPayments.map((b) => b.customer_id).filter(Boolean)));
  const { data: profiles } = custIds.length
    ? await db.from('profiles').select('id, full_name, email').in('id', custIds)
    : { data: [] };

  const rawProfiles = (profiles ?? []) as any[];
  const profileMap = Object.fromEntries(
    rawProfiles.map((p) => [p.id, p])
  );

  const payments = rawPayments.map((b) => ({
    ...b,
    customer: profileMap[b.customer_id] ?? null,
  })) as HouservePayment[];

  return { payments, total: count ?? 0 };
}
