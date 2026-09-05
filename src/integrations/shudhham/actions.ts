'use server';

import { getShudhhamClient } from '@/lib/supabase/shudhham';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function requireShudhham() {
  await requireWorkspaceAccess('shudhham');
  return getShudhhamClient();
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
  const db = await requireShudhham();
  const { error } = await table(db, 'products').insert({
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    category: input.category,
    image_url: input.image_url ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath('/shudhham/products');
  return { success: true };
}

export async function updateShudhhamProduct(id: string, input: Partial<ShudhhamProductInput>) {
  const db = await requireShudhham();
  const { error } = await table(db, 'products').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shudhham/products');
  return { success: true };
}

export async function deleteShudhhamProduct(id: string) {
  const db = await requireShudhham();
  const { error } = await table(db, 'products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shudhham/products');
  return { success: true };
}

// ── Order status mutations ────────────────────────────────────

export async function updateShudhhamOrderStatus(id: string, status: string) {
  const db = await requireShudhham();
  const { error } = await table(db, 'orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shudhham/orders');
  return { success: true };
}
