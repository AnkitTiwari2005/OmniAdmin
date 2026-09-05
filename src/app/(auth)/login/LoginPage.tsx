'use client';

import { useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, ShieldCheck, Clock } from 'lucide-react';

// ── Inner form (uses useSearchParams — must be inside Suspense) ─

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const searchParams = useSearchParams();
  const notAuthorized = searchParams.get('error') === 'not_authorized';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  async function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { requestPasswordResetAction } = await import('./actions');
      const result = await requestPasswordResetAction(resetEmail, origin);
      if (result?.error) {
        setError(result.error);
      } else {
        setResetSent(true);
      }
    });
  }

  if (mode === 'forgot_password') {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-base">Reset Password</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Enter your administrator email address and we will send you a recovery link.
          </p>
        </div>

        {resetSent ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600 dark:text-emerald-400">
              <p className="font-medium">Recovery Link Dispatched</p>
              <p className="text-xs mt-1 text-emerald-600/80 dark:text-emerald-400/80">
                If an admin account exists for <strong>{resetEmail}</strong>, instructions to reset your password have been sent.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setMode('login');
                setResetSent(false);
                setError(null);
              }}
              className="w-full"
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
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

            <Button type="submit" disabled={isPending || !resetEmail} className="w-full mt-1">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Link…
                </>
              ) : (
                'Send Recovery Link'
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      {searchParams.get('reason') === 'idle_timeout' && (
        <div className="mb-4 flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Your session timed out after 30 minutes of inactivity. Please sign in again.</p>
        </div>
      )}

      {notAuthorized && (
        <div className="mb-4 flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Your account isn&apos;t authorized for admin access. Contact your super admin.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => {
                setMode('forgot_password');
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
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
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">OmniAdmin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unified admin panel · Sign in to continue
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="rounded-2xl border bg-card p-6 shadow-sm h-56 animate-pulse" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Internal tool · Access restricted to authorized admins only
        </p>
      </div>
    </div>
  );
}
