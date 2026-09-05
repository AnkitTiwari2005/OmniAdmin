// ============================================================
// src/lib/supabase/buildkart.ts
//
// Server-side ONLY Supabase client for the BuildKart project.
// ⚠️  SERVICE ROLE — never expose to browser.
//
// Note: BuildKart's orders table stores `items` as JSONB (not
// a separate order_items table). We type it as unknown[] and
// parse it in the integration layer.
// ============================================================

import { createClient } from '@supabase/supabase-js';

export type BuildKartOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
};

export type BuildKartDB = {
  products: {
    Row: {
      id: string;
      name: string;
      brand: string | null;
      description: string | null;
      price: number;
      original_price: number | null;
      discount: number | null;
      category: string;
      subcategory: string | null;
      images: string[] | null;
      rating: number | null;
      review_count: number | null;
      stock: number | null;
      is_active: boolean;
      is_featured: boolean;
      is_bestseller: boolean;
      variants: unknown | null;
      specifications: unknown | null;
      tags: string[] | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<BuildKartDB['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<BuildKartDB['products']['Insert']>;
  };
  categories: {
    Row: {
      id: string;
      name: string;
      is_active: boolean;
      sort_order: number;
    };
    Insert: Omit<BuildKartDB['categories']['Row'], 'id'>;
    Update: Partial<BuildKartDB['categories']['Insert']>;
  };
  profiles: {
    Row: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      avatar_url: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: Partial<Pick<BuildKartDB['profiles']['Row'], 'name' | 'phone' | 'avatar_url'>>;
  };
  addresses: {
    Row: {
      id: string;
      user_id: string;
      name: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string | null;
      pincode: string;
      type: 'Home' | 'Work' | 'Other' | string | null;
      is_default: boolean;
      created_at: string;
    };
    Insert: never;
    Update: never;
  };
  orders: {
    Row: {
      id: string;
      user_id: string;
      items: BuildKartOrderItem[] | unknown;
      total: number;
      address: Record<string, unknown> | null;
      payment_method: string | null;
      payment_id: string | null;
      status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
      timeline: unknown | null;
      estimated_delivery: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: Partial<Pick<BuildKartDB['orders']['Row'], 'status' | 'estimated_delivery'>>;
  };
  wishlist: {
    Row: {
      id: string;
      user_id: string;
      product_id: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
  };
};

let _buildkartClient: ReturnType<typeof createClient<BuildKartDB>> | null = null;

export function getBuildKartClient() {
  if (!_buildkartClient) {
    const url = process.env.BUILDKART_SUPABASE_URL;
    const key = process.env.BUILDKART_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'BUILDKART_SUPABASE_URL and BUILDKART_SUPABASE_SERVICE_ROLE_KEY must be set in .env.local'
      );
    }

    _buildkartClient = createClient<BuildKartDB>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _buildkartClient;
}
