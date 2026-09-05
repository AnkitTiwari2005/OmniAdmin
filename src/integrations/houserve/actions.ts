'use server';

import { getHouserveClient } from '@/lib/supabase/houserve';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { BookingStatus } from './types';
import { logAdminActivity } from '@/lib/audit';
import {
  bookingStatusSchema,
  assignTechnicianSchema,
  houserveServiceSchema,
  houservePromotionSchema,
  technicianCreateSchema,
  technicianPromoteSchema,
  technicianDemoteSchema,
  technicianUpdateSchema,
  technicianToggleActiveSchema,
  uuidSchema,
} from '@/lib/validation/schemas';

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
  const parsed = bookingStatusSchema.safeParse({ bookingId, status });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid booking status input' };
  }

  const { db, admin } = await requireHouserve();
  const { error } = await table(db, 'bookings')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
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
    details: { newStatus: parsed.data.status },
  });

  revalidatePath('/houserve/bookings');
  return { success: true };
}

export async function assignTechnicianToBooking(bookingId: string, technicianId: string) {
  const parsed = assignTechnicianSchema.safeParse({ bookingId, technicianId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid booking or technician ID' };
  }

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
  const parsed = houserveServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid service input' };
  }

  const { db, admin } = await requireHouserve();
  const valid = parsed.data;

  const { error } = await table(db, 'services').insert({
    name: valid.name,
    category: valid.category,
    description: valid.description ?? null,
    price: valid.price,
    duration_minutes: valid.duration_minutes ?? 60,
    is_active: valid.is_active ?? true,
    sort_order: valid.sort_order ?? 999,
  });
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'houserve',
    targetTable: 'services',
    details: { name: valid.name, category: valid.category, price: valid.price },
  });

  revalidatePath('/houserve/services');
  return { success: true };
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid service ID' };

  const parsed = houserveServiceSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid service input' };
  }

  const { db, admin } = await requireHouserve();
  const valid = parsed.data;

  const { error } = await table(db, 'services')
    .update({ ...valid, updated_at: new Date().toISOString() })
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
    details: valid,
  });

  revalidatePath('/houserve/services');
  return { success: true };
}

export async function toggleServiceActive(id: string, isActive: boolean) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid service ID' };

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
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid service ID' };

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
  const parsed = houservePromotionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid promotion input' };
  }

  const { db, admin } = await requireHouserve();
  const valid = parsed.data;

  const { error } = await table(db, 'promotions').insert({
    title: valid.title,
    subtitle: valid.subtitle ?? null,
    cta_text: valid.cta_text ?? 'Book Now',
    bg_gradient: valid.bg_gradient ?? 'from-blue-600 to-indigo-700',
    link_path: valid.link_path ?? '/services',
    is_active: valid.is_active ?? true,
    sort_order: valid.sort_order ?? 0,
    image_url: valid.image_url ?? null,
  });
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'houserve',
    targetTable: 'promotions',
    details: { title: valid.title },
  });

  revalidatePath('/houserve/promotions');
  return { success: true };
}

export async function updatePromotion(id: string, input: Partial<PromotionInput>) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid promotion ID' };

  const parsed = houservePromotionSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid promotion input' };
  }

  const { db, admin } = await requireHouserve();
  const valid = parsed.data;

  const { error } = await table(db, 'promotions').update(valid).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'houserve',
    targetTable: 'promotions',
    targetId: id,
    details: valid,
  });

  revalidatePath('/houserve/promotions');
  return { success: true };
}

export async function togglePromotionActive(id: string, isActive: boolean) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid promotion ID' };

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
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid promotion ID' };

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
  const parsed = technicianPromoteSchema.safeParse({ customerId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid customer ID' };
  }

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
  const parsed = technicianDemoteSchema.safeParse({ technicianId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid technician ID' };
  }

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
  const parsed = technicianUpdateSchema.safeParse({ id, ...input });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid technician details' };
  }

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
  const parsed = technicianToggleActiveSchema.safeParse({ id, isActive });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid technician ID or active state' };
  }

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

export async function createTechnician(input: {
  full_name: string;
  email: string;
  phone: string;
  password?: string;
}) {
  const parsed = technicianCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid technician details' };
  }

  const { db, admin } = await requireHouserve();
  const valid = parsed.data;

  // Generate a temporary password if none supplied
  const tempPassword = valid.password || ('Tech@' + Math.random().toString(36).slice(2, 10) + '!');

  // 1. Create auth user in Houserve Supabase project
  const { data: userData, error: userError } = await db.auth.admin.createUser({
    email: valid.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: valid.full_name,
      phone: valid.phone,
    },
  });

  if (userError) {
    return { error: userError.message };
  }

  if (!userData.user) {
    return { error: 'Failed to create user account for technician.' };
  }

  const userId = userData.user.id;

  // 2. Insert/Upsert profile with role = 'technician'
  const { error: profileError } = await table(db, 'profiles').upsert({
    id: userId,
    full_name: valid.full_name,
    email: valid.email,
    phone: valid.phone,
    role: 'technician',
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    // Rollback created auth user
    await db.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  // 3. Log activity
  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'houserve',
    targetTable: 'profiles',
    targetId: userId,
    details: { full_name: valid.full_name, email: valid.email, phone: valid.phone, role: 'technician' },
  });

  revalidatePath('/houserve/technicians');
  return { success: true, id: userId };
}

