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

export async function getShudhhamCustomers(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<{ customers: ShudhhamCustomer[]; total: number }> {
  const db = getShudhhamClient();
  const { search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('profiles')
    .select('id, full_name, email, phone, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
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

export async function getShudhhamPayments(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<{ payments: ShudhhamPayment[]; total: number }> {
  const db = getShudhhamClient();
  const { search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('orders')
    .select('id, full_name, total_amount, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const payments = ((data ?? []) as Array<Record<string, unknown>>).map((o) => ({
    id: o.id as string,
    full_name: o.full_name as string | null,
    total_amount: Number(o.total_amount) || 0,
    payment_status: (o.status ?? 'completed') as string,
    stripe_payment_intent_id: null,
    payment_id: (o.id as string).slice(0, 12),
    created_at: o.created_at as string,
    customer: { full_name: o.full_name as string | null, email: null },
  })) as ShudhhamPayment[];

  return { payments, total: count ?? 0 };
}

// ── Orders list ───────────────────────────────────────────────

export interface ShudhhamOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface ShudhhamOrder {
  id: string;
  user_id?: string;
  full_name: string | null;
  total_amount: number;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  created_at: string;
  items: ShudhhamOrderItem[];
}

export async function getShudhhamOrders(
  filters: { status?: string; search?: string; page?: number; limit?: number } = {}
): Promise<{ orders: ShudhhamOrder[]; total: number }> {
  const db = getShudhhamClient();
  const { status, search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('orders')
    .select('id, user_id, full_name, total_amount, status, address, city, state, pin_code, created_at, order_items(*)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const orders: ShudhhamOrder[] = ((data ?? []) as Array<Record<string, unknown>>).map((o) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems = (o.order_items ?? []) as Array<any>;
    const items: ShudhhamOrderItem[] = rawItems.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));

    return {
      id: o.id as string,
      user_id: o.user_id as string | undefined,
      full_name: o.full_name as string | null,
      total_amount: Number(o.total_amount) || 0,
      status: (o.status as 'processing' | 'shipped' | 'delivered' | 'cancelled') || 'processing',
      address: o.address as string | null,
      city: o.city as string | null,
      state: o.state as string | null,
      pin_code: o.pin_code as string | null,
      created_at: o.created_at as string,
      items,
    };
  });

  return { orders, total: count ?? 0 };
}

// ── Weekly chart data (Optimized: 1 query instead of 14) ─────

export async function getShudhhamWeeklyChart(): Promise<Array<{ date: string; orders: number; revenue: number }>> {
  const db = getShudhhamClient();
  const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await db
    .from('orders')
    .select('id, total_amount, status, created_at')
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const dayBuckets: Record<string, { label: string; orders: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = {
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      orders: 0,
      revenue: 0,
    };
  }

  ((data ?? []) as any[]).forEach((row) => {
    const dayKey = row.created_at ? row.created_at.slice(0, 10) : '';
    if (dayBuckets[dayKey]) {
      dayBuckets[dayKey].orders += 1;
      if (row.status !== 'cancelled') {
        dayBuckets[dayKey].revenue += Number(row.total_amount) || 0;
      }
    }
  });

  return Object.values(dayBuckets).map((b) => ({
    date: b.label,
    orders: b.orders,
    revenue: b.revenue,
  }));
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
