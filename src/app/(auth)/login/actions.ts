'use server';

import { createAdminSessionClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createAdminSessionClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}

export async function logoutAction() {
  const supabase = await createAdminSessionClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestPasswordResetAction(email: string, redirectToOrigin: string) {
  if (!email) return { error: 'Email is required.' };
  const supabase = await createAdminSessionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${redirectToOrigin}/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: true };
}
