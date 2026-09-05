'use server';

import { getHouserveClient } from '@/lib/supabase/houserve';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { BookingStatus } from './types';

async function requireHouserve() {
  await requireWorkspaceAccess('houserve');
  return getHouserveClient();
}

// Cast the table query to any so Supabase's strict generics don't produce 'never'
// on update/insert. The service-role key already enforces access server-side.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(db: ReturnType<typeof getHouserveClient>, name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).from(name);
}

// ── Booking mutations ─────────────────────────────────────────

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const db = await requireHouserve();
  const { error } = await table(db, 'bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) return { error: error.message };
  revalidatePath('/houserve/bookings');
  return { success: true };
}

export async function assignTechnicianToBooking(bookingId: string, technicianId: string) {
  const db = await requireHouserve();
  const { error } = await table(db, 'bookings')
    .update({ technician_id: technicianId, status: 'assigned', updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) return { error: error.message };
  revalidatePath('/houserve/bookings');
  return { success: true };
}

// ── Service mutations ─────────────────────────────────────────

export interface ServiceInput {
  name: string;
  category: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active?: boolean;
  sort_order?: number;
}

export async function createService(input: ServiceInput) {
  const db = await requireHouserve();
  const { error } = await table(db, 'services').insert({
    name: input.name,
    category: input.category,
    description: input.description ?? null,
    price: input.price,
    duration_minutes: input.duration_minutes,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 999,
  });
  if (error) return { error: error.message };
  revalidatePath('/houserve/services');
  return { success: true };
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  const db = await requireHouserve();
  const { error } = await table(db, 'services')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/houserve/services');
  return { success: true };
}

export async function toggleServiceActive(id: string, isActive: boolean) {
  const db = await requireHouserve();
  const { error } = await table(db, 'services').update({ is_active: isActive }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/houserve/services');
  return { success: true };
}

export async function deleteService(id: string) {
  const db = await requireHouserve();
  const { error } = await table(db, 'services').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/houserve/services');
  return { success: true };
}
