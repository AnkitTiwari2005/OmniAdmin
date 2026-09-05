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
      price: number;
      original_price: number | null;
      category: string;
      subcategory: string | null;
      brand: string | null;
      is_active: boolean;
      is_featured: boolean;
      is_bestseller: boolean;
      rating: number | null;
      review_count: number;
      image_url: string | null;
      specifications: unknown | null; // JSONB array of {key, value}
      description: string | null;
      created_at: string;
    };
    Insert: Omit<BuildKartDB['products']['Row'], 'id' | 'created_at'>;
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
      // BuildKart profiles table has minimal columns — extend as confirmed
      created_at?: string;
    };
    Insert: never;
    Update: never;
  };
  addresses: {
    Row: {
      id: string;
      user_id: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
  };
  orders: {
    Row: {
      id: string;
      user_id: string;
      /** JSONB blob — parse with BuildKartOrderItem[] */
      items: BuildKartOrderItem[];
      total: number;
      address: Record<string, unknown> | null;
      payment_method: string | null;
      payment_id: string | null;
      status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
      created_at: string;
    };
    Insert: never;
    Update: Pick<BuildKartDB['orders']['Row'], 'status'>;
  };
  wishlist: {
    Row: {
      id: string;
      user_id: string;
      product_id: string;
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
