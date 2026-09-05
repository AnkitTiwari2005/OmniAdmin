// ============================================================
// src/integrations/buildkart/queries.ts — server-only
// ============================================================

import { getBuildKartClient } from '@/lib/supabase/buildkart';

export interface BuildKartKPIs {
  ordersToday: number;
  revenueThisWeek: number;
  revenueTrend: number;
  totalCustomers: number;
  pendingOrders: number;
  totalProducts: number;
}

export interface BuildKartRecentOrder {
  id: string;
  total: number;
  status: string;
  payment_method: string | null;
  payment_id: string | null;
  created_at: string;
}

export async function getBuildKartDashboardKPIs(): Promise<BuildKartKPIs> {
  const db = getBuildKartClient();

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
    totalProducts,
  ] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    db.from('orders').select('total').gte('created_at', weekAgo.toISOString()).neq('status', 'Cancelled'),
    db.from('orders').select('total').gte('created_at', prevWeekStart.toISOString()).lt('created_at', weekAgo.toISOString()).neq('status', 'Cancelled'),
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Processing'),
    db.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const thisWeekRev = ((revenueThisWeek.data ?? []) as Array<{ total: number }>)
    .reduce((s, o) => s + (o.total ?? 0), 0);
  const prevWeekRev = ((revenuePrevWeek.data ?? []) as Array<{ total: number }>)
    .reduce((s, o) => s + (o.total ?? 0), 0);
  const revenueTrend = prevWeekRev === 0 ? 0 : ((thisWeekRev - prevWeekRev) / prevWeekRev) * 100;

  return {
    ordersToday: ordersToday.count ?? 0,
    revenueThisWeek: thisWeekRev,
    revenueTrend: Math.round(revenueTrend),
    totalCustomers: totalCustomers.count ?? 0,
    pendingOrders: pendingOrders.count ?? 0,
    totalProducts: totalProducts.count ?? 0,
  };
}

export async function getBuildKartRecentOrders(limit = 5): Promise<BuildKartRecentOrder[]> {
  const db = getBuildKartClient();
  const { data, error } = await db
    .from('orders')
    .select('id, total, status, payment_method, payment_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as BuildKartRecentOrder[];
}

// ── Customers list ────────────────────────────────────────────

export interface BuildKartCustomer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export async function getBuildKartCustomers(page = 1, limit = 30): Promise<{ customers: BuildKartCustomer[]; total: number }> {
  const db = getBuildKartClient();
  const offset = (page - 1) * limit;
  const { data, count, error } = await db
    .from('profiles')
    .select('id, full_name, email, phone, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { customers: (data ?? []) as BuildKartCustomer[], total: count ?? 0 };
}

// ── Payments list ─────────────────────────────────────────────

export interface BuildKartPayment {
  id: string;
  total_amount: number;
  payment_status: string;
  razorpay_payment_id: string | null;
  payment_id: string | null;
  created_at: string;
  customer: { full_name: string | null; email: string | null } | null;
}

export async function getBuildKartPayments(page = 1, limit = 30): Promise<{ payments: BuildKartPayment[]; total: number }> {
  const db = getBuildKartClient();
  const offset = (page - 1) * limit;
  const { data, count, error } = await db
    .from('orders')
    .select('id, total, status, payment_method, payment_id, user_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const userIds = (data ?? []).map((o) => (o as Record<string, unknown>).user_id as string).filter(Boolean);
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [(p as Record<string, unknown>).id as string, p]));

  const payments = ((data ?? []) as Array<Record<string, unknown>>).map((o) => ({
    id: o.id as string,
    total_amount: o.total as number,
    payment_status: (o.status as string) ?? 'unknown',
    razorpay_payment_id: o.payment_id as string | null,
    payment_id: o.payment_id as string | null,
    created_at: o.created_at as string,
    customer: profileMap[o.user_id as string] ?? null,
  })) as BuildKartPayment[];

  return { payments, total: count ?? 0 };
}

// ── Orders list ───────────────────────────────────────────────

export interface BuildKartOrder {
  id: string;
  total: number;
  status: string;
  payment_method: string | null;
  payment_id: string | null;
  created_at: string;
}

export async function getBuildKartOrders(
  filters: { status?: string; page?: number; limit?: number } = {}
): Promise<{ orders: BuildKartOrder[]; total: number }> {
  const db = getBuildKartClient();
  const { status, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('orders')
    .select('id, total, status, payment_method, payment_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { orders: (data ?? []) as BuildKartOrder[], total: count ?? 0 };
}

// ── Weekly chart data ─────────────────────────────────────────

export async function getBuildKartWeeklyChart(): Promise<Array<{ date: string; orders: number; revenue: number }>> {
  const db = getBuildKartClient();
  const result: Array<{ date: string; orders: number; revenue: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);

    const [cnt, rev] = await Promise.all([
      db.from('orders').select('*', { count: 'exact', head: true })
        .gte('created_at', d.toISOString()).lte('created_at', end.toISOString()),
      db.from('orders').select('id, total')
        .gte('created_at', d.toISOString()).lte('created_at', end.toISOString()).neq('status', 'Cancelled'),
    ]);

    result.push({
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      orders: cnt.count ?? 0,
      revenue: ((rev.data ?? []) as Array<{ total: number }>).reduce((s, o) => s + (o.total ?? 0), 0),
    });
  }
  return result;
}

// ── Products ──────────────────────────────────────────────────

export interface BuildKartProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  rating: number | null;
  review_count: number | null;
  image_url: string | null;
  created_at: string;
}

export async function getBuildKartProducts(
  filters: { category?: string; brand?: string; search?: string; page?: number; limit?: number } = {}
): Promise<{ products: BuildKartProduct[]; total: number }> {
  const db = getBuildKartClient();
  const { category, search, page = 1, limit = 40 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('products')
    .select('id, name, price, original_price, category, subcategory, brand, is_active, is_featured, is_bestseller, rating, review_count, image_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('category', category);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  let products = (data ?? []) as BuildKartProduct[];
  if (search) {
    const s = search.toLowerCase();
    products = products.filter((p) => p.name.toLowerCase().includes(s) || (p.brand ?? '').toLowerCase().includes(s));
  }
  return { products, total: count ?? 0 };
}

// ── Categories ────────────────────────────────────────────────

export interface BuildKartCategory {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export async function getBuildKartCategories(): Promise<BuildKartCategory[]> {
  const db = getBuildKartClient();
  const { data, error } = await db
    .from('categories')
    .select('id, name, is_active, sort_order, created_at')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BuildKartCategory[];
}
