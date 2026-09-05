// ============================================================
// src/lib/supabase/admin-browser.ts
//
// CLIENT-SAFE — no next/headers import. Used in 'use client' components.
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

export type AdminRole =
  | 'super_admin'
  | 'shudhham_admin'
  | 'houserve_admin'
  | 'buildkart_admin';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  created_at: string;
}

export function createAdminBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY!
  );
}
