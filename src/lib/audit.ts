import { createAdminServiceClient } from '@/lib/supabase/admin';

export interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  admin_name: string | null;
  action: string;
  workspace: string;
  target_table: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export async function logAdminActivity({
  adminId,
  adminEmail,
  adminName,
  action,
  workspace,
  targetTable,
  targetId,
  details = {},
}: {
  adminId?: string | null;
  adminEmail?: string | null;
  adminName?: string | null;
  action: string;
  workspace: string;
  targetTable: string;
  targetId?: string | null;
  details?: Record<string, any>;
}) {
  try {
    const service = createAdminServiceClient();
    await (service as any).from('admin_activity_log').insert({
      admin_id: adminId ?? null,
      admin_email: adminEmail ?? null,
      admin_name: adminName ?? null,
      action,
      workspace,
      target_table: targetTable,
      target_id: targetId ?? null,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking logger: silently log to server console so user actions are unaffected
    console.warn('[AuditLog] Failed to record activity log entry:', err);
  }
}

export async function getRecentActivity(limit = 50): Promise<AuditLogEntry[]> {
  try {
    const service = createAdminServiceClient();
    const { data, error } = await (service as any)
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[AuditLog] Activity log table not yet available:', error.message);
      return [];
    }
    return (data ?? []) as AuditLogEntry[];
  } catch {
    return [];
  }
}
