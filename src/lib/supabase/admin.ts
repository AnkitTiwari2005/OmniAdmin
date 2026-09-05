// ============================================================
// src/lib/supabase/admin.ts
//
// SERVER-ONLY — imports next/headers. Never import from 'use client' files.
// For browser usage, import from './admin-browser' instead.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type { AdminRole, AdminProfile } from './admin-browser';

// ── Service-role client (bypasses RLS) ───────────────────────
export function createAdminServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
    process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY!,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cookies: { getAll: () => [], setAll: () => {} } as any,
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

// ── Session client (reads/writes cookies for auth) ───────────
export async function createAdminSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookiesToSet.forEach(({ name, value, options }: any) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — writes must happen in middleware.
          }
        },
      },
    }
  );
}
