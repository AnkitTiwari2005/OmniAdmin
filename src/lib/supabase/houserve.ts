// ============================================================
// src/lib/supabase/houserve.ts
//
// Server-side ONLY Supabase client for the Houserve project.
// ⚠️  SERVICE ROLE — never expose to browser.
// ============================================================

import { createClient } from '@supabase/supabase-js';

export type HouserveDB = {
  profiles: {
    Row: {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      avatar_url: string | null;
      /** display only — NOT used for admin-app auth */
      role: 'customer' | 'technician' | 'admin';
      razorpay_customer_id: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: Pick<HouserveDB['profiles']['Row'], 'role'>;
  };
  services: {
    Row: {
      id: string;
      name: string;
      category: string;
      description: string | null;
      price: number;
      duration_minutes: number;
      image_url: string | null;
      is_active: boolean;
      sort_order: number;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<HouserveDB['services']['Row'], 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<HouserveDB['services']['Insert']>;
  };
  bookings: {
    Row: {
      id: string;
      booking_ref: string;
      customer_id: string;
      service_id: string | null;
      technician_id: string | null;
      status:
        | 'confirmed'
        | 'assigned'
        | 'accepted'
        | 'on_the_way'
        | 'in_progress'
        | 'completed'
        | 'cancelled';
      scheduled_date: string;
      scheduled_time: string;
      address_id: string | null;
      address_snapshot: Record<string, unknown> | null;
      special_instructions: string | null;
      subtotal: number;
      platform_fee: number;
      gst_amount: number;
      total_amount: number;
      razorpay_order_id: string | null;
      razorpay_payment_id: string | null;
      payment_status: 'pending' | 'paid' | 'failed';
      stripe_payment_intent_id: string | null;
      stripe_payment_status: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: Pick<HouserveDB['bookings']['Row'], 'status' | 'technician_id' | 'payment_status'>;
  };
  booking_items: {
    Row: {
      id: string;
      booking_id: string;
      service_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      created_at: string;
    };
    Insert: never;
    Update: never;
  };
  user_addresses: {
    Row: {
      id: string;
      user_id: string;
      label: string;
      flat_number: string;
      building_name: string | null;
      street: string;
      landmark: string | null;
      city: string;
      pincode: string;
      phone: string | null;
      full_address: string;
      latitude: number | null;
      longitude: number | null;
      is_default: boolean;
      created_at: string;
    };
    Insert: never;
    Update: never;
  };
  notifications: {
    Row: {
      id: string;
      user_id: string;
      title: string;
      body: string;
      type: 'booking' | 'support' | 'promo' | 'info';
      booking_id: string | null;
      is_read: boolean;
      created_at: string;
    };
    Insert: Omit<HouserveDB['notifications']['Row'], 'id' | 'created_at' | 'is_read'>;
    Update: Pick<HouserveDB['notifications']['Row'], 'is_read'>;
  };
};

let _houserveClient: ReturnType<typeof createClient<HouserveDB>> | null = null;

export function getHouserveClient() {
  if (!_houserveClient) {
    const url = process.env.HOUSERVE_SUPABASE_URL;
    const key = process.env.HOUSERVE_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'HOUSERVE_SUPABASE_URL and HOUSERVE_SUPABASE_SERVICE_ROLE_KEY must be set in .env.local'
      );
    }

    _houserveClient = createClient<HouserveDB>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _houserveClient;
}
