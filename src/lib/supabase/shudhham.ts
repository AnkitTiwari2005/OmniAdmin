// ============================================================
// src/lib/supabase/shudhham.ts
//
// Server-side ONLY Supabase client for the Shudhham project.
// Uses the SERVICE ROLE key — full table access, bypasses RLS.
//
// ⚠️  NEVER import this file in a browser component (*.tsx with
//    'use client').  Next.js will catch ADMIN_SUPABASE_SERVICE_ROLE_KEY
//    leaks if you do — keep this in Server Components / API routes only.
// ============================================================

import { createClient } from '@supabase/supabase-js';

export type ShudhhamDB = {
  products: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      category: string;
      image_url: string | null;
      created_at: string;
    };
    Insert: Omit<ShudhhamDB['products']['Row'], 'id' | 'created_at'>;
    Update: Partial<ShudhhamDB['products']['Insert']>;
  };
  profiles: {
    Row: {
      id: string;
      email: string | null;
      full_name: string | null;
      phone: string | null;
      age: number | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: Partial<Pick<ShudhhamDB['profiles']['Row'], 'full_name' | 'phone' | 'age'>>;
  };
  addresses: {
    Row: {
      id: string;
      user_id: string;
      first_name: string;
      last_name: string;
      address_line1: string;
      address_line2: string | null;
      city: string;
      state: string;
      pin_code: string;
      phone: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
  };
  orders: {
    Row: {
      id: string;
      user_id: string;
      total_amount: number;
      full_name: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      pin_code: string | null;
      status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
      created_at: string;
    };
    Insert: never;
    Update: Pick<ShudhhamDB['orders']['Row'], 'status'>;
  };
  order_items: {
    Row: {
      id: string;
      order_id: string;
      product_id: string | null;
      product_name: string;
      quantity: number;
      price: number;
    };
    Insert: never;
    Update: never;
  };
};

let _shudhhamClient: ReturnType<typeof createClient<ShudhhamDB>> | null = null;

export function getShudhhamClient() {
  if (!_shudhhamClient) {
    const url = process.env.SHUDHHAM_SUPABASE_URL;
    const key = process.env.SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'SHUDHHAM_SUPABASE_URL and SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY must be set in .env.local'
      );
    }

    _shudhhamClient = createClient<ShudhhamDB>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _shudhhamClient;
}
