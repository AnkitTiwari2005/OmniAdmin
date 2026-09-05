'use server';

import { getHouserveClient } from '@/lib/supabase/houserve';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { BookingStatus } from './types';
import { logAdminActivity } from '@/lib/audit';

async function requireHouserve() {
  const admin = await requireWorkspaceAccess('houserve');
  return { db: getHouserveClient(), admin };
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
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'houserve',
    targetTable: 'bookings',
    targetId: bookingId,
    details: { newStatus: status },
  });

  revalidatePath('/houserve/bookings');
  return { success: true };
}

export async function assignTechnicianToBooking(bookingId: string, technicianId: string) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'bookings')
    .update({ technician_id: technicianId, status: 'assigned', updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'assign_technician',
    workspace: 'houserve',
    targetTable: 'bookings',
    targetId: bookingId,
    details: { assignedTechnicianId: technicianId },
  });

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
  const { db, admin } = await requireHouserve();
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

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'houserve',
    targetTable: 'services',
    details: { name: input.name, category: input.category, price: input.price },
  });

  revalidatePath('/houserve/services');
  return { success: true };
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'services')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'houserve',
    targetTable: 'services',
    targetId: id,
    details: input,
  });

  revalidatePath('/houserve/services');
  return { success: true };
}

export async function toggleServiceActive(id: string, isActive: boolean) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'services').update({ is_active: isActive }).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'houserve',
    targetTable: 'services',
    targetId: id,
    details: { is_active: isActive },
  });

  revalidatePath('/houserve/services');
  return { success: true };
}

export async function deleteService(id: string) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'services').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'delete',
    workspace: 'houserve',
    targetTable: 'services',
    targetId: id,
  });

  revalidatePath('/houserve/services');
  return { success: true };
}

// ── Promotion mutations ───────────────────────────────────────

export interface PromotionInput {
  title: string;
  subtitle?: string | null;
  cta_text?: string | null;
  bg_gradient?: string | null;
  link_path?: string | null;
  is_active?: boolean;
  sort_order?: number;
  image_url?: string | null;
}

export async function createPromotion(input: PromotionInput) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'promotions').insert({
    title: input.title,
    subtitle: input.subtitle ?? null,
    cta_text: input.cta_text ?? 'Book Now',
    bg_gradient: input.bg_gradient ?? 'from-blue-600 to-indigo-700',
    link_path: input.link_path ?? '/services',
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
    image_url: input.image_url ?? null,
  });
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'houserve',
    targetTable: 'promotions',
    details: { title: input.title },
  });

  revalidatePath('/houserve/promotions');
  return { success: true };
}

export async function updatePromotion(id: string, input: Partial<PromotionInput>) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'promotions').update(input).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'houserve',
    targetTable: 'promotions',
    targetId: id,
    details: input,
  });

  revalidatePath('/houserve/promotions');
  return { success: true };
}

export async function togglePromotionActive(id: string, isActive: boolean) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'promotions').update({ is_active: isActive }).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'houserve',
    targetTable: 'promotions',
    targetId: id,
    details: { is_active: isActive },
  });

  revalidatePath('/houserve/promotions');
  return { success: true };
}

export async function deletePromotion(id: string) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'promotions').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'delete',
    workspace: 'houserve',
    targetTable: 'promotions',
    targetId: id,
  });

  revalidatePath('/houserve/promotions');
  return { success: true };
}

// ── Technician mutations ───────────────────────────────────────

export async function promoteCustomerToTechnician(customerId: string) {
  const { db, admin } = await requireHouserve();
  // Try setting role to technician and is_active to true
  const { error } = await table(db, 'profiles')
    .update({ role: 'technician', is_active: true, updated_at: new Date().toISOString() })
    .eq('id', customerId);

  if (error) {
    // If is_active column does not exist yet, fallback to updating role only
    const { error: retryErr } = await table(db, 'profiles')
      .update({ role: 'technician', updated_at: new Date().toISOString() })
      .eq('id', customerId);
    if (retryErr) return { error: retryErr.message };
  }

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'houserve',
    targetTable: 'profiles',
    targetId: customerId,
    details: { promotedTo: 'technician' },
  });

  revalidatePath('/houserve/technicians');
  return { success: true };
}

export async function demoteTechnicianToCustomer(technicianId: string) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'profiles')
    .update({ role: 'customer', updated_at: new Date().toISOString() })
    .eq('id', technicianId);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'houserve',
    targetTable: 'profiles',
    targetId: technicianId,
    details: { demotedTo: 'customer' },
  });

  revalidatePath('/houserve/technicians');
  return { success: true };
}

export async function updateTechnician(
  id: string,
  input: { full_name?: string; phone?: string; email?: string }
) {
  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'profiles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'houserve',
    targetTable: 'profiles',
    targetId: id,
    details: input,
  });

  revalidatePath('/houserve/technicians');
  return { success: true };
}

export async function toggleTechnicianActive(id: string, isActive: boolean) {
  const { db, admin } = await requireHouserve();
  // Try updating is_active column
  const { error } = await table(db, 'profiles')
    .update({ is_active: isActive, role: isActive ? 'technician' : 'technician_inactive', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    // Fallback to role-only if is_active column is not present
    const { error: retryErr } = await table(db, 'profiles')
      .update({ role: isActive ? 'technician' : 'technician_inactive', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (retryErr) return { error: retryErr.message };
  }

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'houserve',
    targetTable: 'profiles',
    targetId: id,
    details: { is_active: isActive },
  });

  revalidatePath('/houserve/technicians');
  return { success: true };
}

