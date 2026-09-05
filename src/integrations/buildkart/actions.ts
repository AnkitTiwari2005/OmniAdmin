'use server';

import { getBuildKartClient } from '@/lib/supabase/buildkart';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function requireBuildKart() {
  await requireWorkspaceAccess('buildkart');
  return getBuildKartClient();
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
  const db = await requireBuildKart();
  const calculatedDiscount =
    input.discount != null
      ? input.discount
      : input.original_price && input.original_price > input.price
      ? Math.round(((input.original_price - input.price) / input.original_price) * 100)
      : 0;

  const { error } = await table(db, 'products').insert({
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
  });
  if (error) return { error: error.message };
  revalidatePath('/buildkart/products');
  return { success: true };
}

export async function updateBuildKartProduct(id: string, input: Partial<BuildKartProductInput>) {
  const db = await requireBuildKart();
  const updatePayload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  if (input.discount === undefined && input.original_price && input.price) {
    updatePayload.discount = Math.round(((input.original_price - input.price) / input.original_price) * 100);
  }

  const { error } = await table(db, 'products').update(updatePayload).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/buildkart/products');
  return { success: true };
}

// ── Order status mutations ────────────────────────────────────

export async function updateBuildKartOrderStatus(
  id: string,
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
) {
  const db = await requireBuildKart();
  const { error } = await table(db, 'orders').update({
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/buildkart/orders');
  return { success: true };
}

export async function toggleBuildKartProductField(id: string, field: 'is_active' | 'is_featured' | 'is_bestseller', value: boolean) {
  const db = await requireBuildKart();
  const { error } = await table(db, 'products').update({ [field]: value }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/buildkart/products');
  return { success: true };
}

export async function deleteBuildKartProduct(id: string) {
  const db = await requireBuildKart();
  const { error } = await table(db, 'products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/buildkart/products');
  return { success: true };
}

// ── Category mutations ────────────────────────────────────────

export async function createBuildKartCategory(name: string, sortOrder = 999) {
  const db = await requireBuildKart();
  const { error } = await table(db, 'categories').insert({ name, is_active: true, sort_order: sortOrder });
  if (error) return { error: error.message };
  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function updateBuildKartCategory(id: string, data: { name?: string; sort_order?: number }) {
  const db = await requireBuildKart();
  const { error } = await table(db, 'categories').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function toggleBuildKartCategoryActive(id: string, isActive: boolean) {
  const db = await requireBuildKart();
  const { error } = await table(db, 'categories').update({ is_active: isActive }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/buildkart/categories');
  return { success: true };
}

export async function deleteBuildKartCategory(id: string) {
  const db = await requireBuildKart();
  const { error } = await table(db, 'categories').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/buildkart/categories');
  return { success: true };
}
