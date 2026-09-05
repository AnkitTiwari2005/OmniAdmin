// ============================================================
// src/integrations/shudhham/queries.ts — server-only
// ============================================================

import { getShudhhamClient } from '@/lib/supabase/shudhham';

export interface ShudhhamKPIs {
  ordersToday: number;
  revenueThisWeek: number;
  revenueTrend: number;
  totalCustomers: number;
  pendingOrders: number;
}

export interface ShudhhamRecentOrder {
  id: string;
  full_name: string | null;
  total_amount: number;
  status: string;
  created_at: string;
}

export async function getShudhhamDashboardKPIs(): Promise<ShudhhamKPIs> {
  const db = getShudhhamClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [
    ordersToday,
    revenueThisWeek,
    revenuePrevWeek,
    totalCustomers,
    pendingOrders,
  ] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    db.from('orders').select('total_amount').gte('created_at', weekAgo.toISOString()).neq('status', 'cancelled'),
    db.from('orders').select('total_amount').gte('created_at', prevWeekStart.toISOString()).lt('created_at', weekAgo.toISOString()).neq('status', 'cancelled'),
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
  ]);

  const thisWeekRev = ((revenueThisWeek.data ?? []) as Array<{ total_amount: number }>)
    .reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const prevWeekRev = ((revenuePrevWeek.data ?? []) as Array<{ total_amount: number }>)
    .reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const revenueTrend = prevWeekRev === 0 ? 0 : ((thisWeekRev - prevWeekRev) / prevWeekRev) * 100;

  return {
    ordersToday: ordersToday.count ?? 0,
    revenueThisWeek: thisWeekRev,
    revenueTrend: Math.round(revenueTrend),
    totalCustomers: totalCustomers.count ?? 0,
    pendingOrders: pendingOrders.count ?? 0,
  };
}

export async function getShudhhamRecentOrders(limit = 5): Promise<ShudhhamRecentOrder[]> {
  const db = getShudhhamClient();
  const { data, error } = await db
    .from('orders')
    .select('id, full_name, total_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ShudhhamRecentOrder[];
}

// ── Customers list ────────────────────────────────────────────

export interface ShudhhamCustomer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export async function getShudhhamCustomers(page = 1, limit = 30): Promise<{ customers: ShudhhamCustomer[]; total: number }> {
  const db = getShudhhamClient();
  const offset = (page - 1) * limit;
  const { data, count, error } = await db
    .from('profiles')
    .select('id, full_name, email, phone, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { customers: (data ?? []) as ShudhhamCustomer[], total: count ?? 0 };
}

// ── Payments list ─────────────────────────────────────────────

export interface ShudhhamPayment {
  id: string;
  full_name: string | null;
  total_amount: number;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  customer: { full_name: string | null; email: string | null } | null;
  payment_id: string | null;
}

export async function getShudhhamPayments(page = 1, limit = 30): Promise<{ payments: ShudhhamPayment[]; total: number }> {
  const db = getShudhhamClient();
  const offset = (page - 1) * limit;
  const { data, count, error } = await db
    .from('orders')
    .select('id, full_name, total_amount, status, payment_status, payment_intent_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const payments = ((data ?? []) as Array<Record<string, unknown>>).map((o) => ({
    ...o,
    payment_status: (o.payment_status ?? o.status ?? 'unknown') as string,
    stripe_payment_intent_id: o.payment_intent_id as string | null,
    payment_id: o.payment_intent_id as string | null,
    customer: { full_name: o.full_name as string | null, email: null },
  })) as ShudhhamPayment[];

  return { payments, total: count ?? 0 };
}

// ── Orders list ───────────────────────────────────────────────

export interface ShudhhamOrder {
  id: string;
  full_name: string | null;
  total_amount: number;
  status: string;
  payment_status: string | null;
  created_at: string;
}

export async function getShudhhamOrders(
  filters: { status?: string; page?: number; limit?: number } = {}
): Promise<{ orders: ShudhhamOrder[]; total: number }> {
  const db = getShudhhamClient();
  const { status, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('orders')
    .select('id, full_name, total_amount, status, payment_status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { orders: (data ?? []) as ShudhhamOrder[], total: count ?? 0 };
}

// ── Weekly chart data ─────────────────────────────────────────

export async function getShudhhamWeeklyChart(): Promise<Array<{ date: string; orders: number; revenue: number }>> {
  const db = getShudhhamClient();
  const result: Array<{ date: string; orders: number; revenue: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);

    const [cnt, rev] = await Promise.all([
      db.from('orders').select('*', { count: 'exact', head: true })
        .gte('created_at', d.toISOString()).lte('created_at', end.toISOString()),
      db.from('orders').select('id, total_amount')
        .gte('created_at', d.toISOString()).lte('created_at', end.toISOString()).neq('status', 'cancelled'),
    ]);

    result.push({
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      orders: cnt.count ?? 0,
      revenue: ((rev.data ?? []) as Array<{ total_amount: number }>).reduce((s, o) => s + (o.total_amount ?? 0), 0),
    });
  }
  return result;
}

// ── Products ──────────────────────────────────────────────────

export interface ShudhhamProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  created_at: string;
}

export async function getShudhhamProducts(
  filters: { category?: string; search?: string; page?: number; limit?: number } = {}
): Promise<{ products: ShudhhamProduct[]; total: number }> {
  const db = getShudhhamClient();
  const { category, search, page = 1, limit = 40 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('products')
    .select('id, name, description, price, category, image_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('category', category);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  let products = (data ?? []) as ShudhhamProduct[];
  if (search) {
    const s = search.toLowerCase();
    products = products.filter((p) => p.name.toLowerCase().includes(s) || (p.category ?? '').toLowerCase().includes(s));
  }
  return { products, total: count ?? 0 };
}
