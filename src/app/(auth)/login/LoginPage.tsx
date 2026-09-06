'use client';

import { useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Loader2,
  ShieldCheck,
  Clock,
  Zap,
  BarChart3,
  Globe,
} from 'lucide-react';

// ── Brand-panel data ───────────────────────────────────────────

const features = [
  { icon: Zap,       color: 'text-amber-400',  label: 'Real-time Analytics'   },
  { icon: Globe,     color: 'text-sky-400',     label: 'Portfolio Overview'    },
  { icon: BarChart3, color: 'text-emerald-400', label: 'Secure Access Control' },
];

const workspaces = [
  { label: 'Shudhham',  dot: 'bg-emerald-400' },
  { label: 'Houserve',  dot: 'bg-sky-400'     },
  { label: 'BuildKart', dot: 'bg-amber-400'   },
];

// ── Inner form (uses useSearchParams — must be inside Suspense) ─

function LoginForm() {
  const [error, setError]            = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode]              = useState<'login' | 'forgot_password'>('login');
  const [resetSent, setResetSent]    = useState(false);
  const [resetEmail, setResetEmail]  = useState('');
  const searchParams                 = useSearchParams();
  const notAuthorized                = searchParams.get('error') === 'not_authorized';

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

  /* ── Forgot-password mode ── */
  if (mode === 'forgot_password') {
    return (
      <div className="glass-card card-highlight rounded-3xl p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="font-semibold text-lg">Reset Password</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Enter your administrator email address and we will send you a recovery link.
          </p>
        </div>

        {resetSent ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600 dark:text-emerald-400">
              <p className="font-medium">Recovery Link Dispatched</p>
              <p className="text-xs mt-1 text-emerald-600/80 dark:text-emerald-400/80">
                If an admin account exists for <strong>{resetEmail}</strong>, instructions to
                reset your password have been sent.
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

  /* ── Login mode ── */
  return (
    <div className="glass-card card-highlight rounded-3xl p-8 shadow-2xl">
      {/* Logo mark */}
      <div className="flex flex-col items-start gap-4 mb-8">
        <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sign in to your admin account
          </p>
        </div>
      </div>

      {/* Idle-timeout banner */}
      {searchParams.get('reason') === 'idle_timeout' && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Your session timed out after 30 minutes of inactivity. Please sign in again.</p>
        </div>
      )}

      {/* Not-authorized banner */}
      {notAuthorized && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
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

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Internal tool · Access restricted to authorized admins only
      </p>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────

export function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* ═══════════════════════════════════════════════════════
          LEFT — Cinematic brand panel (lg+ only)
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-950 flex-col items-start justify-center px-16">

        {/* Animated blur orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* top-right — indigo */}
          <span className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
          {/* bottom-left — emerald */}
          <span className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl animate-pulse [animation-delay:1.2s]" />
          {/* center-right — sky */}
          <span className="absolute top-1/2 right-0 h-64 w-64 -translate-y-1/2 rounded-full bg-sky-500/10 blur-3xl animate-pulse [animation-delay:0.6s]" />
          {/* bottom-right — amber */}
          <span className="absolute bottom-16 right-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl animate-pulse [animation-delay:1.8s]" />
        </div>

        {/* Subtle dot-grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-md">
          {/* Logo pill */}
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 mb-10 backdrop-blur-sm">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">OmniAdmin</span>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
            Unified<br />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              Command Center
            </span>
          </h2>
          <p className="text-slate-400 text-base mb-12 leading-relaxed">
            One dashboard to orchestrate every workspace, portfolio, and service your business runs.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-5 mb-16">
            {features.map(({ icon: Icon, color, label }) => (
              <li key={label} className="flex items-center gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm shrink-0">
                  <Icon className={`h-4 w-4 ${color}`} />
                </span>
                <span className="text-slate-200 text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>

          {/* Workspace chips */}
          <div className="flex flex-wrap gap-2">
            {workspaces.map(({ label, dot }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-300 backdrop-blur-sm"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RIGHT — Login form
      ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-1 lg:w-1/2 items-center justify-center p-8 bg-background relative">
        {/* Ambient grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-sm w-full">
          {/* Mobile-only logo (hidden on lg) */}
          <div className="flex flex-col items-center gap-2 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">OmniAdmin</span>
          </div>

          <Suspense
            fallback={
              <div className="glass-card card-highlight rounded-3xl p-8 shadow-2xl h-72 animate-pulse" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
