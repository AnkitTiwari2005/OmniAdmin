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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function searchGlobalRecords(query: string): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  await requireAdmin();

  const isUuid = UUID_REGEX.test(q);
  const results: SearchResultItem[] = [];

  // Build query promises with schema-safe filters (never ilike on uuid columns)
  const shudhhamOrderQuery = isUuid
    ? getShudhhamClient().from('orders').select('id, full_name, total_amount, status, created_at').eq('id', q).limit(3)
    : getShudhhamClient().from('orders').select('id, full_name, total_amount, status, created_at').ilike('full_name', `%${q}%`).limit(3);

  const buildkartOrderQuery = isUuid
    ? getBuildKartClient().from('orders').select('id, total, status, created_at').eq('id', q).limit(3)
    : Promise.resolve({ data: [] as any[], error: null });

  const houserveBookingQuery = isUuid
    ? getHouserveClient().from('bookings').select('id, booking_ref, total_amount, status, created_at').eq('id', q).limit(3)
    : getHouserveClient().from('bookings').select('id, booking_ref, total_amount, status, created_at').ilike('booking_ref', `%${q}%`).limit(3);

  const shudhhamCustQuery = isUuid
    ? getShudhhamClient().from('profiles').select('id, full_name, email').eq('id', q).limit(3)
    : getShudhhamClient().from('profiles').select('id, full_name, email').or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(3);

  const houserveCustQuery = isUuid
    ? getHouserveClient().from('profiles').select('id, full_name, email').eq('id', q).limit(3)
    : getHouserveClient().from('profiles').select('id, full_name, email').or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(3);

  const buildkartCustQuery = isUuid
    ? getBuildKartClient().from('profiles').select('id, name, email').eq('id', q).limit(3)
    : getBuildKartClient().from('profiles').select('id, name, email').or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(3);

  const [
    shudhhamOrdersRes,
    buildkartOrdersRes,
    houserveBookingsRes,
    shudhhamCustRes,
    houserveCustRes,
    buildkartCustRes,
  ] = await Promise.allSettled([
    shudhhamOrderQuery,
    buildkartOrderQuery,
    houserveBookingQuery,
    shudhhamCustQuery,
    houserveCustQuery,
    buildkartCustQuery,
  ]);

  // 1. Shudhham Orders (searched by customer name or UUID)
  if (shudhhamOrdersRes.status === 'fulfilled' && shudhhamOrdersRes.value.data) {
    for (const o of shudhhamOrdersRes.value.data as Array<{ id: string; full_name: string | null; total_amount: number; status: string }>) {
      results.push({
        id: `shudhham-order-${o.id}`,
        title: `Order #${o.id.slice(0, 8)} (${o.full_name || 'Customer'})`,
        subtitle: `₹${o.total_amount} · ${o.status}`,
        href: `/shudhham/orders?q=${o.id}`,
        group: 'Orders & Bookings',
        badge: 'Shudhham',
      });
    }
  }

  // 2. BuildKart Orders (searched by UUID)
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

  // 3. Houserve Bookings (searched by booking_ref or UUID)
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

  // 4. Shudhham Customers
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

  // 5. Houserve Customers
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

  // 6. BuildKart Customers
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
