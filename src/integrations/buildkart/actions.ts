'use server';

import { getBuildKartClient } from '@/lib/supabase/buildkart';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from '@/lib/audit';

async function requireBuildKart() {
  const admin = await requireWorkspaceAccess('buildkart');
  return { db: getBuildKartClient(), admin };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(db: ReturnType<typeof getBuildKartClient>, name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).from(name);
}

// ── Product mutations ─────────────────────────────────────────

export interface BuildKartProductInput {
  name: string;
  price: number;
  original_price?: number | null;
  discount?: number | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  images?: string[] | null;
  stock?: number | null;
  is_active?: boolean;
  is_featured?: boolean;
  is_bestseller?: boolean;
}

export async function createBuildKartProduct(input: BuildKartProductInput) {
  const { db, admin } = await requireBuildKart();
  const calculatedDiscount =
    input.discount != null
      ? input.discount
      : input.original_price && input.original_price > input.price
      ? Math.round(((input.original_price - input.price) / input.original_price) * 100)
      : 0;

  const { data, error } = await table(db, 'products').insert({
    name: input.name,
    price: input.price,
    original_price: input.original_price ?? null,
    discount: calculatedDiscount,
    category: input.category,
    subcategory: input.subcategory ?? null,
    brand: input.brand ?? null,
    images: input.images ?? [],
    stock: input.stock ?? 0,
    is_active: input.is_active ?? true,
    is_featured: input.is_featured ?? false,
    is_bestseller: input.is_bestseller ?? false,
    rating: 0,
    review_count: 0,
  }).select().single();
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'buildkart',
    targetTable: 'products',
    targetId: data?.id,
    details: { name: input.name, price: input.price, category: input.category, stock: input.stock },
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

export async function updateBuildKartProduct(id: string, input: Partial<BuildKartProductInput>) {
  const { db, admin } = await requireBuildKart();
  const updatePayload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  if (input.discount === undefined && input.original_price && input.price) {
    updatePayload.discount = Math.round(((input.original_price - input.price) / input.original_price) * 100);
  }

  const { error } = await table(db, 'products').update(updatePayload).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'buildkart',
    targetTable: 'products',
    targetId: id,
    details: input,
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

// ── Order status mutations ────────────────────────────────────

export async function updateBuildKartOrderStatus(
  id: string,
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'orders').update({
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'buildkart',
    targetTable: 'orders',
    targetId: id,
    details: { newStatus: status },
  });

  revalidatePath('/buildkart/orders');
  return { success: true };
}

export async function toggleBuildKartProductField(id: string, field: 'is_active' | 'is_featured' | 'is_bestseller', value: boolean) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'products').update({ [field]: value }).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'buildkart',
    targetTable: 'products',
    targetId: id,
    details: { [field]: value },
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

export async function deleteBuildKartProduct(id: string) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'products').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'delete',
    workspace: 'buildkart',
    targetTable: 'products',
    targetId: id,
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

export async function bulkUpdateBuildKartProducts(
  ids: string[],
  patch: Partial<BuildKartProductInput>
) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'products')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'bulk_update',
    workspace: 'buildkart',
    targetTable: 'products',
    details: { count: ids.length, patch },
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

// ── Category mutations ────────────────────────────────────────

export async function createBuildKartCategory(name: string, sortOrder = 999) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'categories').insert({ name, is_active: true, sort_order: sortOrder });
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'buildkart',
    targetTable: 'categories',
    details: { name, sort_order: sortOrder },
  });

  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function updateBuildKartCategory(id: string, data: { name?: string; sort_order?: number }) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'categories').update(data).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'buildkart',
    targetTable: 'categories',
    targetId: id,
    details: data,
  });

  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function toggleBuildKartCategoryActive(id: string, isActive: boolean) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'categories').update({ is_active: isActive }).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'status_change',
    workspace: 'buildkart',
    targetTable: 'categories',
    targetId: id,
    details: { is_active: isActive },
  });

  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function deleteBuildKartCategory(id: string) {
  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'categories').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'delete',
    workspace: 'buildkart',
    targetTable: 'categories',
    targetId: id,
  });

  revalidatePath('/buildkart/categories');
  return { success: true };
}
