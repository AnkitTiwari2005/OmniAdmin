// ============================================================
// src/lib/auth.ts
//
// Admin session helpers — all server-side.
// These functions validate the Supabase Auth session from the
// admin project, then look up the admin_profiles role.
// ============================================================

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createAdminSessionClient, createAdminServiceClient } from './supabase/admin';
import type { AdminProfile, AdminRole } from './supabase/admin-browser';

export type { AdminProfile, AdminRole };

// ── Get the currently logged-in admin user + their role ───────
// Trusts the middleware's network-verified session headers to eliminate
// a redundant second auth network call on every navigation, while strictly
// enforcing the database role check against admin_profiles.
export async function requireAdmin(): Promise<AdminProfile> {
  const headerList = await headers();
  const verifiedId = headerList.get('x-admin-id');
  const verifiedEmail = headerList.get('x-admin-email');

  let userId = verifiedId;
  let userEmail = verifiedEmail;

  if (!userId) {
    const supabase = await createAdminSessionClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      redirect('/login');
    }
    userId = user.id;
    userEmail = user.email!;
  }

  // Fetch role from admin_profiles (enforces role check server-side)
  const service = createAdminServiceClient();
  const { data: profile, error: profileError } = await service
    .from('admin_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.is_active === false) {
    redirect('/login?error=not_authorized');
  }

  return {
    id: userId,
    email: userEmail || '',
    full_name: profile.full_name,
    role: profile.role as AdminRole,
    created_at: profile.created_at,
  };
}

// ── Require super_admin role ──────────────────────────────────
export async function requireSuperAdmin(): Promise<AdminProfile> {
  const admin = await requireAdmin();
  if (admin.role !== 'super_admin') {
    redirect('/');
  }
  return admin;
}

// ── Get the admin without redirecting (returns null if not authed) ─
export async function getAdminOrNull(): Promise<AdminProfile | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

// ── Check if the admin can access a given workspace ───────────
export function canAccessWorkspace(role: AdminRole, workspace: string): boolean {
  if (role === 'super_admin') return true;
  return role === `${workspace}_admin`;
}

// ── Require access to a specific workspace ────────────────────
export async function requireWorkspaceAccess(workspace: string): Promise<AdminProfile> {
  const admin = await requireAdmin();
  if (!canAccessWorkspace(admin.role, workspace)) {
    redirect('/');
  }
  return admin;
}
