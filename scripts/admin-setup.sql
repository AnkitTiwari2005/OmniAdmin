-- ============================================================
-- OmniAdmin — Admin Project Database Setup
-- Run this SQL in your NEW dedicated Supabase project's SQL Editor.
-- (The project that holds ONLY admin auth — not business data.)
-- ============================================================

-- 1. Create admin_profiles table
--    Keyed to auth.users.id in THIS admin project.
--    The role column controls which workspaces each admin can access.

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'shudhham_admin'
               CHECK (role IN ('super_admin', 'shudhham_admin', 'houserve_admin', 'buildkart_admin')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Admins can read their own profile
CREATE POLICY "Admin can read own profile"
  ON public.admin_profiles FOR SELECT
  USING (auth.uid() = id);

-- Service role has full access (used by the admin app's server-side routes)
CREATE POLICY "Service role full access"
  ON public.admin_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Grant permissions
GRANT SELECT ON public.admin_profiles TO authenticated;
GRANT ALL    ON public.admin_profiles TO service_role;

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HOW TO CREATE YOUR FIRST SUPER_ADMIN
-- ============================================================
-- 1. In the admin Supabase project:
--    Authentication → Users → Add User
--    Enter your admin email + password. Save the UUID shown.
--
-- 2. Run this (replace the UUID and name):
--
--    INSERT INTO public.admin_profiles (id, full_name, role)
--    VALUES ('paste-uuid-here', 'Your Name', 'super_admin');
--
-- 3. Done. Log in at http://localhost:3000/login with those credentials.
-- ============================================================
