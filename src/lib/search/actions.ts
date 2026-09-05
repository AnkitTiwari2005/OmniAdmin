'use server';

import { getShudhhamClient } from '@/lib/supabase/shudhham';
import { getHouserveClient } from '@/lib/supabase/houserve';
import { getBuildKartClient } from '@/lib/supabase/buildkart';
import { requireAdmin } from '@/lib/auth';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: 'Pages' | 'Orders & Bookings' | 'Customers';
  badge: string;
}

export async function searchGlobalRecords(query: string): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  await requireAdmin();

  const results: SearchResultItem[] = [];

  const [shudhhamOrdersRes, buildkartOrdersRes, houserveBookingsRes, shudhhamCustRes, houserveCustRes, buildkartCustRes] =
    await Promise.allSettled([
      // Shudhham orders
      getShudhhamClient()
        .from('orders')
        .select('id, order_ref, total_amount, status, created_at')
        .or(`id.ilike.%${q}%,order_ref.ilike.%${q}%`)
        .limit(3),

      // BuildKart orders
      getBuildKartClient()
        .from('orders')
        .select('id, total, status, created_at')
        .ilike('id', `%${q}%`)
        .limit(3),

      // Houserve bookings
      getHouserveClient()
        .from('bookings')
        .select('id, booking_ref, total_amount, status, created_at')
        .or(`id.ilike.%${q}%,booking_ref.ilike.%${q}%`)
        .limit(3),

      // Shudhham customers
      getShudhhamClient()
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(3),

      // Houserve customers
      getHouserveClient()
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'customer')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(3),

      // BuildKart customers
      getBuildKartClient()
        .from('profiles')
        .select('id, name, email')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(3),
    ]);

  // Shudhham Orders
  if (shudhhamOrdersRes.status === 'fulfilled' && shudhhamOrdersRes.value.data) {
    for (const o of shudhhamOrdersRes.value.data as Array<{ id: string; order_ref: string | null; total_amount: number; status: string }>) {
      results.push({
        id: `shudhham-order-${o.id}`,
        title: `Order ${o.order_ref || o.id.slice(0, 8)}`,
        subtitle: `₹${o.total_amount} · ${o.status}`,
        href: `/shudhham/orders?q=${o.order_ref || o.id}`,
        group: 'Orders & Bookings',
        badge: 'Shudhham',
      });
    }
  }

  // BuildKart Orders
  if (buildkartOrdersRes.status === 'fulfilled' && buildkartOrdersRes.value.data) {
    for (const o of buildkartOrdersRes.value.data as Array<{ id: string; total: number; status: string }>) {
      results.push({
        id: `buildkart-order-${o.id}`,
        title: `Order #${o.id.slice(0, 8)}`,
        subtitle: `₹${o.total} · ${o.status}`,
        href: `/buildkart/orders?q=${o.id}`,
        group: 'Orders & Bookings',
        badge: 'BuildKart',
      });
    }
  }

  // Houserve Bookings
  if (houserveBookingsRes.status === 'fulfilled' && houserveBookingsRes.value.data) {
    for (const b of houserveBookingsRes.value.data as Array<{ id: string; booking_ref: string | null; total_amount: number; status: string }>) {
      results.push({
        id: `houserve-booking-${b.id}`,
        title: `Booking ${b.booking_ref || b.id.slice(0, 8)}`,
        subtitle: `₹${b.total_amount} · ${b.status}`,
        href: `/houserve/bookings?q=${b.booking_ref || b.id}`,
        group: 'Orders & Bookings',
        badge: 'Houserve',
      });
    }
  }

  // Shudhham Customers
  if (shudhhamCustRes.status === 'fulfilled' && shudhhamCustRes.value.data) {
    for (const c of shudhhamCustRes.value.data as Array<{ id: string; full_name: string | null; email: string | null }>) {
      results.push({
        id: `shudhham-cust-${c.id}`,
        title: c.full_name || 'Customer',
        subtitle: c.email || 'No email',
        href: `/shudhham/customers?q=${c.email || c.full_name || c.id}`,
        group: 'Customers',
        badge: 'Shudhham',
      });
    }
  }

  // Houserve Customers
  if (houserveCustRes.status === 'fulfilled' && houserveCustRes.value.data) {
    for (const c of houserveCustRes.value.data as Array<{ id: string; full_name: string | null; email: string | null }>) {
      results.push({
        id: `houserve-cust-${c.id}`,
        title: c.full_name || 'Customer',
        subtitle: c.email || 'No email',
        href: `/houserve/customers?q=${c.email || c.full_name || c.id}`,
        group: 'Customers',
        badge: 'Houserve',
      });
    }
  }

  // BuildKart Customers
  if (buildkartCustRes.status === 'fulfilled' && buildkartCustRes.value.data) {
    for (const c of buildkartCustRes.value.data as Array<{ id: string; name: string | null; email: string | null }>) {
      results.push({
        id: `buildkart-cust-${c.id}`,
        title: c.name || 'Customer',
        subtitle: c.email || 'No email',
        href: `/buildkart/customers?q=${c.email || c.name || c.id}`,
        group: 'Customers',
        badge: 'BuildKart',
      });
    }
  }

  return results;
}
