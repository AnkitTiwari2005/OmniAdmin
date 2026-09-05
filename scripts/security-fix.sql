-- ============================================================
-- OmniAdmin — Security & Correctness Database Migration
-- Run this in your Admin Supabase project SQL Editor:
-- https://pyfblkmjevxtfrlzoxmb.supabase.co
-- ============================================================

-- ------------------------------------------------------------
-- 1. HARDEN RLS ON admin_profiles
--    Ensure "Service role full access" is explicitly scoped TO service_role
--    so it stops leaking all admin rows to regular authenticated admins.
-- ------------------------------------------------------------

-- Add email column if not already present
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing profiles with emails from auth.users
UPDATE public.admin_profiles
SET email = u.email
FROM auth.users u
WHERE public.admin_profiles.id = u.id AND public.admin_profiles.email IS NULL;

-- Enable RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Drop insecure / permissive policies
DROP POLICY IF EXISTS "Service role full access" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin can read own profile" ON public.admin_profiles;

-- Strictly scope service role full access to service_role only
CREATE POLICY "Service role full access"
  ON public.admin_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated admins can only read their OWN profile row
CREATE POLICY "Admin can read own profile"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Permissions
GRANT SELECT ON public.admin_profiles TO authenticated;
GRANT ALL    ON public.admin_profiles TO service_role;


-- ------------------------------------------------------------
-- 2. CREATE AND HARDEN admin_activity_log
--    Full audit trail for admin actions. Accessible ONLY by service_role.
-- ------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at
  ON public.admin_activity_log (created_at DESC);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop any previous insecure policy
DROP POLICY IF EXISTS "Service role full access on activity log" ON public.admin_activity_log;

-- Strictly scope access to service_role only
CREATE POLICY "Service role full access on activity log"
  ON public.admin_activity_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Revoke all direct client-side access from authenticated and public
REVOKE ALL ON public.admin_activity_log FROM authenticated, anon, public;
GRANT ALL  ON public.admin_activity_log TO service_role;


-- ------------------------------------------------------------
-- 3. CONFIGURE STORAGE BUCKET & RLS POLICIES (omni-assets)
--    Public read access for image CDN, service_role write access.
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'omni-assets',
  'omni-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- Storage RLS on storage.objects
DROP POLICY IF EXISTS "Public Access to omni-assets" ON storage.objects;
CREATE POLICY "Public Access to omni-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'omni-assets');

DROP POLICY IF EXISTS "Service Role Full Access to omni-assets" ON storage.objects;
CREATE POLICY "Service Role Full Access to omni-assets"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'omni-assets')
  WITH CHECK (bucket_id = 'omni-assets');
