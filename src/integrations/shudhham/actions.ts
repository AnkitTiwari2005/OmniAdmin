'use server';

import { getShudhhamClient } from '@/lib/supabase/shudhham';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from '@/lib/audit';
import {
  shudhhamProductSchema,
  shudhhamOrderStatusSchema,
  uuidSchema,
} from '@/lib/validation/schemas';
import { z } from 'zod';

async function requireShudhham() {
  const admin = await requireWorkspaceAccess('shudhham');
  return { db: getShudhhamClient(), admin };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(db: ReturnType<typeof getShudhhamClient>, name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).from(name);
}

// ── Product mutations ─────────────────────────────────────────

export interface ShudhhamProductInput {
  name: string;
  description?: string | null;
  price: number;
  category: string;
  image_url?: string | null;
}

export async function createShudhhamProduct(input: ShudhhamProductInput) {
  const parsed = shudhhamProductSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid product input' };
  }

  const { db, admin } = await requireShudhham();
  const valid = parsed.data;

  const { data, error } = await table(db, 'products').insert({
    name: valid.name,
    description: valid.description ?? null,
    price: valid.price,
    category: valid.category,
    image_url: valid.image_url ?? null,
  }).select().single();

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'shudhham',
    targetTable: 'products',
    targetId: data?.id,
    details: { name: valid.name, price: valid.price, category: valid.category },
  });

  revalidatePath('/shudhham/products');
  return { success: true };
}

export async function updateShudhhamProduct(id: string, input: Partial<ShudhhamProductInput>) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid product ID' };

  const inputParsed = shudhhamProductSchema.partial().safeParse(input);
  if (!inputParsed.success) {
    return { error: inputParsed.error.issues[0]?.message || 'Invalid product input' };
  }

  const { db, admin } = await requireShudhham();
  const valid = inputParsed.data;

  const { error } = await table(db, 'products').update(valid).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'shudhham',
    targetTable: 'products',
    targetId: id,
    details: valid,
  });

  revalidatePath('/shudhham/products');
  return { success: true };
}

export async function deleteShudhhamProduct(id: string) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid product ID' };

  const { db, admin } = await requireShudhham();
  const { error } = await table(db, 'products').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'delete',
    workspace: 'shudhham',
    targetTable: 'products',
    targetId: id,
  });

  revalidatePath('/shudhham/products');
  return { success: true };
}

// ── Order status mutations ────────────────────────────────────

export async function updateShudhhamOrderStatus(id: string, status: string) {
  const parsed = shudhhamOrderStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid order status input' };
  }

  const { db, admin } = await requireShudhham();
  const { error } = await table(db, 'orders').update({ status: parsed.data.status }).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'shudhham',
    targetTable: 'orders',
    targetId: id,
    details: { newStatus: parsed.data.status },
  });

  revalidatePath('/shudhham/orders');
  return { success: true };
}

export async function bulkUpdateShudhhamProducts(
  ids: string[],
  patch: Partial<ShudhhamProductInput>
) {
  const idsParsed = z.array(uuidSchema).min(1, 'At least one product must be selected').safeParse(ids);
  if (!idsParsed.success) return { error: idsParsed.error.issues[0]?.message || 'Invalid product IDs' };

  const patchParsed = shudhhamProductSchema.partial().safeParse(patch);
  if (!patchParsed.success) return { error: patchParsed.error.issues[0]?.message || 'Invalid update payload' };

  const { db, admin } = await requireShudhham();
  const validPatch = patchParsed.data;

  const { error } = await table(db, 'products')
    .update(validPatch)
    .in('id', idsParsed.data);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'bulk_update',
    workspace: 'shudhham',
    targetTable: 'products',
    details: { count: ids.length, patch: validPatch },
  });

  revalidatePath('/shudhham/products');
  return { success: true };
}
