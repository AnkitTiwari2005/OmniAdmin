-- ============================================================
-- OmniAdmin — Production Readiness Database Migrations
-- ============================================================

-- ------------------------------------------------------------
-- 1. ADMIN PROJECT (https://pyfblkmjevxtfrlzoxmb.supabase.co)
--    Run this in your Admin Supabase project SQL Editor.
-- ------------------------------------------------------------

-- Add email and is_active columns to admin_profiles
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing super_admin email if needed
UPDATE public.admin_profiles
SET email = u.email
FROM auth.users u
WHERE public.admin_profiles.id = u.id AND public.admin_profiles.email IS NULL;

-- Create admin_activity_log table for full audit trail
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  admin_email TEXT,
  admin_name TEXT,
  action TEXT NOT NULL,
  workspace TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast descending queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at
  ON public.admin_activity_log (created_at DESC);

-- Enable RLS and grant service role full access
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on activity log"
  ON public.admin_activity_log FOR ALL
  USING (true);

GRANT ALL ON public.admin_activity_log TO service_role;
GRANT SELECT ON public.admin_activity_log TO authenticated;


-- ------------------------------------------------------------
-- 2. HOUSERVE PROJECT (https://wwnbbjvxrhjjwfshtxto.supabase.co)
--    Run this in your Houserve Supabase project SQL Editor.
-- ------------------------------------------------------------

-- Add is_active column to Houserve profiles for technician active/inactive status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
