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

export async function getBuildKartCustomers(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<{ customers: BuildKartCustomer[]; total: number }> {
  const db = getBuildKartClient();
  const { search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('profiles')
    .select('id, name, email, phone, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const customers: BuildKartCustomer[] = ((data ?? []) as any[]).map((c: any) => ({
    id: c.id,
    full_name: c.name ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    created_at: c.created_at,
  }));
  return { customers, total: count ?? 0 };
}

// ── Payments list ─────────────────────────────────────────────

export interface BuildKartPayment {
  id: string;
  total_amount: number;
  payment_status: string;
  payment_method: string | null;
  razorpay_payment_id: string | null;
  payment_id: string | null;
  created_at: string;
  customer: { full_name: string | null; email: string | null } | null;
}

export async function getBuildKartPayments(
  filters: { search?: string; page?: number; limit?: number } = {}
): Promise<{ payments: BuildKartPayment[]; total: number }> {
  const db = getBuildKartClient();
  const { search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('orders')
    .select('id, total, status, payment_method, payment_id, user_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`payment_id.ilike.%${search}%,payment_method.ilike.%${search}%,status.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const rawData = (data ?? []) as any[];
  const userIds = Array.from(new Set(rawData.map((o) => o.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, name, email').in('id', userIds)
    : { data: [] };

  const rawProfiles = (profiles ?? []) as any[];
  const profileMap = Object.fromEntries(
    rawProfiles.map((p) => [
      p.id,
      { full_name: p.name ?? null, email: p.email ?? null },
    ])
  );

  const payments: BuildKartPayment[] = rawData.map((o) => ({
    id: o.id,
    total_amount: Number(o.total) || 0,
    payment_status: o.status ?? 'unknown',
    payment_method: o.payment_method ?? null,
    razorpay_payment_id: o.payment_id ?? null,
    payment_id: o.payment_id ?? null,
    created_at: o.created_at,
    customer: profileMap[o.user_id] ?? null,
  }));

  return { payments, total: count ?? 0 };
}

// ── Orders list ───────────────────────────────────────────────

export interface BuildKartOrderItem {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  image?: string;
  category?: string;
}

export interface BuildKartOrderAddress {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string | null;
  pincode?: string;
  type?: string | null;
}

export interface BuildKartOrder {
  id: string;
  user_id: string;
  total: number;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  payment_method: string | null;
  payment_id: string | null;
  created_at: string;
  items: BuildKartOrderItem[];
  address: BuildKartOrderAddress | null;
  customer: { full_name: string | null; email: string | null; phone: string | null } | null;
}

export async function getBuildKartOrders(
  filters: { status?: string; search?: string; page?: number; limit?: number } = {}
): Promise<{ orders: BuildKartOrder[]; total: number }> {
  const db = getBuildKartClient();
  const { status, search, page = 1, limit = 30 } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('orders')
    .select('id, user_id, items, address, total, status, payment_method, payment_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status);
  }

  if (search) {
    query = query.or(`id.ilike.%${search}%,payment_id.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const rawData = (data ?? []) as any[];
  const userIds = Array.from(new Set(rawData.map((o) => o.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, name, email, phone').in('id', userIds)
    : { data: [] };

  const rawProfiles = (profiles ?? []) as any[];
  const profileMap = Object.fromEntries(
    rawProfiles.map((p) => [
      p.id,
      { full_name: p.name ?? null, email: p.email ?? null, phone: p.phone ?? null },
    ])
  );

  const orders: BuildKartOrder[] = rawData.map((o) => {
    let parsedItems: BuildKartOrderItem[] = [];
    if (Array.isArray(o.items)) {
      parsedItems = o.items as BuildKartOrderItem[];
    } else if (typeof o.items === 'string') {
      try {
        parsedItems = JSON.parse(o.items);
      } catch {
        parsedItems = [];
      }
    }

    let parsedAddress: BuildKartOrderAddress | null = null;
    if (o.address && typeof o.address === 'object') {
      parsedAddress = o.address as BuildKartOrderAddress;
    } else if (typeof o.address === 'string') {
      try {
        parsedAddress = JSON.parse(o.address);
      } catch {
        parsedAddress = null;
      }
    }

    return {
      id: o.id,
      user_id: o.user_id,
      total: Number(o.total) || 0,
      status: (o.status as 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled') || 'Processing',
      payment_method: o.payment_method ?? null,
      payment_id: o.payment_id ?? null,
      created_at: o.created_at,
      items: parsedItems,
      address: parsedAddress,
      customer: profileMap[o.user_id] ?? null,
    };
  });

  return { orders, total: count ?? 0 };
}

// ── Weekly chart data (Optimized: 1 query instead of 14) ─────

export async function getBuildKartWeeklyChart(): Promise<Array<{ date: string; orders: number; revenue: number }>> {
  const db = getBuildKartClient();
  const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await db
    .from('orders')
    .select('id, total, status, created_at')
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
      if (row.status !== 'Cancelled') {
        dayBuckets[dayKey].revenue += Number(row.total) || 0;
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

export interface BuildKartProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  discount: number | null;
  stock: number | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  rating: number | null;
  review_count: number | null;
  images: string[];
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
    .select('id, name, price, original_price, discount, stock, category, subcategory, brand, is_active, is_featured, is_bestseller, rating, review_count, images, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('category', category);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  let products = ((data ?? []) as any[]).map((p) => {
    const imagesArr = Array.isArray(p.images) ? (p.images as string[]) : [];
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      original_price: p.original_price != null ? Number(p.original_price) : null,
      discount: p.discount != null ? Number(p.discount) : null,
      stock: p.stock != null ? Number(p.stock) : 0,
      category: p.category,
      subcategory: p.subcategory ?? null,
      brand: p.brand ?? null,
      is_active: Boolean(p.is_active),
      is_featured: Boolean(p.is_featured),
      is_bestseller: Boolean(p.is_bestseller),
      rating: p.rating != null ? Number(p.rating) : null,
      review_count: p.review_count != null ? Number(p.review_count) : null,
      images: imagesArr,
      image_url: imagesArr.length > 0 ? imagesArr[0] : null,
      created_at: p.created_at,
    };
  }) as BuildKartProduct[];

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
