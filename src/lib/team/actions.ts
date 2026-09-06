'use server';

import { createAdminServiceClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import type { AdminRole } from '@/lib/auth';
import type { TeamMember } from './types';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { logAdminActivity } from '@/lib/audit';
import {
  teamMemberInviteSchema,
  teamMemberRoleSchema,
  teamMemberToggleActiveSchema,
  teamMemberRemoveSchema,
} from '@/lib/validation/schemas';

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
  // 0. Validate input server-side with Zod
  const parsed = teamMemberInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid invite input' };
  }

  const valid = parsed.data;
  const currentAdmin = await requireSuperAdmin();
  const service = createAdminServiceClient();

  const headerList = await headers();
  const host = headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : 'https://omni-admin-dashboard.vercel.app';

  // 1. Send invite via Supabase Auth with explicit redirect to reset-password
  const { data: inviteData, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    valid.email,
    {
      redirectTo: `${origin}/reset-password`,
      data: { full_name: valid.full_name },
    }
  );

  if (inviteError) {
    return { error: inviteError.message };
  }

  if (!inviteData.user) {
    return { error: 'Failed to create user during invite' };
  }

  const newUserId = inviteData.user.id;

  // 2. Insert into admin_profiles (schema: id, full_name, role, is_active)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (service as any)
    .from('admin_profiles')
    .insert({
      id: newUserId,
      full_name: valid.full_name,
      role: valid.role,
      is_active: true,
    });

  if (profileError) {
    // Rollback orphaned auth user
    await service.auth.admin.deleteUser(newUserId);
    return { error: profileError.message };
  }

  // 3. Log activity
  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: 'invite',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: newUserId,
    details: { invitedEmail: valid.email, role: valid.role, name: valid.full_name },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function updateAdminMemberRole(id: string, role: AdminRole) {
  const parsed = teamMemberRoleSchema.safeParse({ id, role });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid role or ID' };
  }

  const currentAdmin = await requireSuperAdmin();
  const service = createAdminServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any)
    .from('admin_profiles')
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: 'role_change',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: parsed.data.id,
    details: { newRole: parsed.data.role },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function toggleAdminMemberActive(id: string, isActive: boolean) {
  const parsed = teamMemberToggleActiveSchema.safeParse({ id, isActive });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid active state or ID' };
  }

  const currentAdmin = await requireSuperAdmin();

  // Prevent super_admin from locking themselves out
  if (parsed.data.id === currentAdmin.id && !parsed.data.isActive) {
    return { error: 'You cannot deactivate your own super_admin account.' };
  }

  const service = createAdminServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any)
    .from('admin_profiles')
    .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);

  if (error) {
    return { error: error.message };
  }

  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: parsed.data.isActive ? 'activate' : 'deactivate',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: parsed.data.id,
    details: { isActive: parsed.data.isActive },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function removeAdminMember(id: string) {
  const parsed = teamMemberRemoveSchema.safeParse({ id });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid team member ID' };
  }

  const currentAdmin = await requireSuperAdmin();

  if (parsed.data.id === currentAdmin.id) {
    return { error: 'You cannot remove your own super_admin account.' };
  }

  const service = createAdminServiceClient();

  // Delete from admin_profiles (locks them out of OmniAdmin completely)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any)
    .from('admin_profiles')
    .delete()
    .eq('id', parsed.data.id);

  if (error) return { error: error.message };

  await logAdminActivity({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    adminName: currentAdmin.full_name,
    action: 'delete',
    workspace: 'admin',
    targetTable: 'admin_profiles',
    targetId: parsed.data.id,
    details: { removedAdminId: parsed.data.id },
  });

  revalidatePath('/team');
  return { success: true };
}
