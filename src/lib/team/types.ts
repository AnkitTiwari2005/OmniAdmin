import type { AdminRole } from '@/lib/auth';

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string | null;
}
