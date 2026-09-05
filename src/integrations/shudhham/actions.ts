'use server';

import { getShudhhamClient } from '@/lib/supabase/shudhham';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from '@/lib/audit';

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
  const { db, admin } = await requireShudhham();
  const { data, error } = await table(db, 'products').insert({
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    category: input.category,
    image_url: input.image_url ?? null,
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
    details: { name: input.name, price: input.price, category: input.category },
  });

  revalidatePath('/shudhham/products');
  return { success: true };
}

export async function updateShudhhamProduct(id: string, input: Partial<ShudhhamProductInput>) {
  const { db, admin } = await requireShudhham();
  const { error } = await table(db, 'products').update(input).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'shudhham',
    targetTable: 'products',
    targetId: id,
    details: input,
  });

  revalidatePath('/shudhham/products');
  return { success: true };
}

export async function deleteShudhhamProduct(id: string) {
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
  const { db, admin } = await requireShudhham();
  const { error } = await table(db, 'orders').update({ status }).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'shudhham',
    targetTable: 'orders',
    targetId: id,
    details: { newStatus: status },
  });

  revalidatePath('/shudhham/orders');
  return { success: true };
}

export async function bulkUpdateShudhhamProducts(
  ids: string[],
  patch: Partial<ShudhhamProductInput>
) {
  const { db, admin } = await requireShudhham();
  const { error } = await table(db, 'products')
    .update(patch)
    .in('id', ids);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'bulk_update',
    workspace: 'shudhham',
    targetTable: 'products',
    details: { count: ids.length, patch },
  });

  revalidatePath('/shudhham/products');
  return { success: true };
}
