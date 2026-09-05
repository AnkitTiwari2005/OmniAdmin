'use server';

import { createAdminServiceClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import type { AdminRole } from '@/lib/auth';
import type { TeamMember } from './types';
import { revalidatePath } from 'next/cache';
import { logAdminActivity } from '@/lib/audit';

export async function getTeamMembers(): Promise<TeamMember[]> {
  await requireSuperAdmin();
  const service = createAdminServiceClient();

  // Fetch users from auth.users
  const { data: authData, error: authError } = await service.auth.admin.listUsers();
  if (authError) throw authError;

  // Fetch profiles from admin_profiles
  const { data: profileData, error: profileError } = await service
    .from('admin_profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (profileError) throw profileError;

  const authUserMap = new Map((authData?.users ?? []).map((u) => [u.id, u]));

  const members: TeamMember[] = (profileData ?? []).map((p) => {
    const authUser = authUserMap.get(p.id);
    return {
      id: p.id,
      email: p.email || authUser?.email || '',
      full_name: p.full_name || (authUser?.user_metadata?.full_name as string) || null,
      role: p.role as AdminRole,
      is_active: p.is_active !== false,
      created_at: p.created_at,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    };
  });

  return members;
}

export async function inviteAdminMember(input: {
  email: string;
  full_name: string;
  role: AdminRole;
}) {
  const currentAdmin = await requireSuperAdmin();
  const service = createAdminServiceClient();

  // 1. Send invite via Supabase Auth
  const { data: inviteData, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: { full_name: input.full_name },
    }
  );

  if (inviteError) {
    return { error: inviteError.message };
  }

  if (!inviteData.user) {
    return { error: 'Failed to create user during invite' };
  }

  // 2. Insert into admin_profiles
  // Try inserting with email and is_active; if schema not migrated yet, fallback
  const { error: profileError } = await (service as any)
    .from('admin_profiles')
    .insert({
      id: inviteData.user.id,
      full_name: input.full_name,
      role: input.role,
      email: input.email,
      is_active: true,
    });

  if (profileError) {
    // Retry without extra columns if not migrated yet
    const { error: retryError } = await (service as any)
      .from('admin_profiles')
      .insert({
        id: inviteData.user.id,
        full_name: input.full_name,
        role: input.role,
      });

    if (retryError) {
      return { error: retryError.message };
    }
  }

  // 3. Log activity
  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: 'invite',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: inviteData.user.id,
    details: { invitedEmail: input.email, role: input.role, name: input.full_name },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function updateAdminMemberRole(id: string, role: AdminRole) {
  const currentAdmin = await requireSuperAdmin();
  const service = createAdminServiceClient();

  const { error } = await (service as any)
    .from('admin_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: 'role_change',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: id,
    details: { newRole: role },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function toggleAdminMemberActive(id: string, isActive: boolean) {
  const currentAdmin = await requireSuperAdmin();

  // Prevent super_admin from locking themselves out
  if (id === currentAdmin.id && !isActive) {
    return { error: 'You cannot deactivate your own super_admin account.' };
  }

  const service = createAdminServiceClient();

  const { error } = await (service as any)
    .from('admin_profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: isActive ? 'activate' : 'deactivate',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: id,
    details: { isActive },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function removeAdminMember(id: string) {
  const currentAdmin = await requireSuperAdmin();

  if (id === currentAdmin.id) {
    return { error: 'You cannot remove your own super_admin account.' };
  }

  const service = createAdminServiceClient();

  // Delete from admin_profiles (locks them out of OmniAdmin completely)
  const { error } = await (service as any)
    .from('admin_profiles')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: 'delete',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: id,
    details: { removedAdminId: id },
  });

  revalidatePath('/team');
  return { success: true };
}
