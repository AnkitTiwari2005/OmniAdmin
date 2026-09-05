// ============================================================
// src/lib/auth.ts
//
// Admin session helpers — all server-side.
// These functions validate the Supabase Auth session from the
// admin project, then look up the admin_profiles role.
// ============================================================

import { redirect } from 'next/navigation';
import { createAdminSessionClient, createAdminServiceClient } from './supabase/admin';
import type { AdminProfile, AdminRole } from './supabase/admin-browser';

export type { AdminProfile, AdminRole };

// ── Get the currently logged-in admin user + their role ───────
// Throws a redirect to /login if not authenticated.
export async function requireAdmin(): Promise<AdminProfile> {
  const supabase = await createAdminSessionClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch role from admin_profiles
  const service = createAdminServiceClient();
  const { data: profile, error: profileError } = await service
    .from('admin_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // User authenticated but no admin_profiles row — treat as unauthorized
    await supabase.auth.signOut();
    redirect('/login?error=not_authorized');
  }

  return {
    id: user.id,
    email: user.email!,
    full_name: profile.full_name,
    role: profile.role as AdminRole,
    created_at: profile.created_at,
  };
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
