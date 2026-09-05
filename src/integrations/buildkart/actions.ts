'use server';

import { getBuildKartClient } from '@/lib/supabase/buildkart';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from '@/lib/audit';
import {
  buildKartProductSchema,
  buildKartOrderStatusSchema,
  buildKartCategorySchema,
  uuidSchema,
} from '@/lib/validation/schemas';
import { z } from 'zod';

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
  const parsed = buildKartProductSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid product input' };
  }

  const { db, admin } = await requireBuildKart();
  const valid = parsed.data;

  const calculatedDiscount =
    valid.discount != null
      ? valid.discount
      : valid.original_price && valid.original_price > valid.price
      ? Math.round(((valid.original_price - valid.price) / valid.original_price) * 100)
      : 0;

  const { data, error } = await table(db, 'products').insert({
    name: valid.name,
    price: valid.price,
    original_price: valid.original_price ?? null,
    discount: calculatedDiscount,
    category: valid.category,
    subcategory: valid.subcategory ?? null,
    brand: valid.brand ?? null,
    images: valid.images ?? [],
    stock: valid.stock ?? 0,
    is_active: valid.is_active ?? true,
    is_featured: valid.is_featured ?? false,
    is_bestseller: valid.is_bestseller ?? false,
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
    details: { name: valid.name, price: valid.price, category: valid.category, stock: valid.stock },
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

export async function updateBuildKartProduct(id: string, input: Partial<BuildKartProductInput>) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid product ID' };

  const parsed = buildKartProductSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid product input' };
  }

  const { db, admin } = await requireBuildKart();
  const valid = parsed.data;

  const updatePayload: Record<string, unknown> = {
    ...valid,
    updated_at: new Date().toISOString(),
  };

  if (valid.discount === undefined && valid.original_price && valid.price) {
    updatePayload.discount = Math.round(((valid.original_price - valid.price) / valid.original_price) * 100);
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
    details: valid,
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

// ── Order status mutations ────────────────────────────────────

export async function updateBuildKartOrderStatus(
  id: string,
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
) {
  const parsed = buildKartOrderStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid order status input' };
  }

  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'orders').update({
    status: parsed.data.status,
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
    details: { newStatus: parsed.data.status },
  });

  revalidatePath('/buildkart/orders');
  return { success: true };
}

export async function toggleBuildKartProductField(id: string, field: 'is_active' | 'is_featured' | 'is_bestseller', value: boolean) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid product ID' };

  const fieldSchema = z.enum(['is_active', 'is_featured', 'is_bestseller']);
  const fieldParsed = fieldSchema.safeParse(field);
  if (!fieldParsed.success) return { error: 'Invalid product field' };

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
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid product ID' };

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
  const idsParsed = z.array(uuidSchema).min(1, 'At least one product must be selected').safeParse(ids);
  if (!idsParsed.success) return { error: idsParsed.error.issues[0]?.message || 'Invalid product IDs' };

  const patchParsed = buildKartProductSchema.partial().safeParse(patch);
  if (!patchParsed.success) return { error: patchParsed.error.issues[0]?.message || 'Invalid update payload' };

  const { db, admin } = await requireBuildKart();
  const validPatch = patchParsed.data;

  const { error } = await table(db, 'products')
    .update({ ...validPatch, updated_at: new Date().toISOString() })
    .in('id', idsParsed.data);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'bulk_update',
    workspace: 'buildkart',
    targetTable: 'products',
    details: { count: ids.length, patch: validPatch },
  });

  revalidatePath('/buildkart/products');
  return { success: true };
}

// ── Category mutations ────────────────────────────────────────

export async function createBuildKartCategory(name: string, sortOrder = 999) {
  const parsed = buildKartCategorySchema.safeParse({ name, sortOrder });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid category input' };

  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'categories').insert({
    name: parsed.data.name,
    is_active: true,
    sort_order: parsed.data.sortOrder ?? 999,
  });
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'create',
    workspace: 'buildkart',
    targetTable: 'categories',
    details: { name: parsed.data.name, sort_order: parsed.data.sortOrder },
  });

  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function updateBuildKartCategory(id: string, data: { name?: string; sort_order?: number }) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid category ID' };

  const dataSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
    sort_order: z.number().int().optional(),
  });
  const parsed = dataSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid category input' };

  const { db, admin } = await requireBuildKart();
  const { error } = await table(db, 'categories').update(parsed.data).eq('id', id);
  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.full_name,
    action: 'update',
    workspace: 'buildkart',
    targetTable: 'categories',
    targetId: id,
    details: parsed.data,
  });

  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function toggleBuildKartCategoryActive(id: string, isActive: boolean) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid category ID' };

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
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: 'Invalid category ID' };

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
