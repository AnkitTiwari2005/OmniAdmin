import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
};

const adminUrl = getEnv('NEXT_PUBLIC_ADMIN_SUPABASE_URL')!;
const anonKey = getEnv('NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY')!;

async function main() {
  console.log('=== VERIFYING RLS AS NON-SUPER-ADMIN ===');
  const testEmail = 'test_houserve_rls@example.com';
  const testPassword = 'TestPassword123!';

  const userClient = createClient(adminUrl, anonKey);
  const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInErr) {
    console.error('Sign-in failed:', signInErr);
    return;
  }

  console.log(`Signed in as non-super-admin: ${signInData.user.email} (${signInData.user.id})`);

  // 1. Query admin_profiles
  console.log('\n1. Querying admin_profiles as non-super-admin...');
  const { data: profiles, error: pErr } = await userClient.from('admin_profiles').select('*');
  console.log('Profiles returned count:', profiles?.length, 'Error:', pErr?.message || 'none');
  console.log(JSON.stringify(profiles, null, 2));

  if (profiles && profiles.length === 1 && profiles[0].id === signInData.user.id) {
    console.log('SUCCESS: User can ONLY see their own profile row! All other admins are protected.');
  } else if (profiles && profiles.length > 1) {
    console.error('VULNERABILITY DETECTED: User can still see other admins! Run scripts/security-fix.sql in Supabase SQL editor.');
  }

  // 2. Query admin_activity_log
  console.log('\n2. Querying admin_activity_log as non-super-admin...');
  const { data: activities, error: aErr } = await userClient.from('admin_activity_log').select('*');
  console.log('Activity log returned count:', activities?.length, 'Error:', aErr?.message || 'none');
  if (aErr || (activities && activities.length === 0)) {
    console.log('SUCCESS: Non-super-admin cannot read the activity log directly via client!');
  }
}

main().catch(console.error);
