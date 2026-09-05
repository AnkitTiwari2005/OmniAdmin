'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminBrowserClient } from '@/lib/supabase/admin-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const supabase = createAdminBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <KeyRound className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Set New Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a secure new password for your admin account
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-semibold text-base">Password Updated Successfully</p>
              <p className="text-xs text-muted-foreground">
                Redirecting you to the dashboard…
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" disabled={isPending} className="w-full mt-1">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password…
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>

              <div className="text-center mt-2">
                <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                  ← Return to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
