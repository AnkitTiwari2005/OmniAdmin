'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createAdminBrowserClient } from '@/lib/supabase/admin-browser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes total
const WARNING_MS = 28 * 60 * 1000; // Warning at 28 minutes (2 mins remaining)
const COUNTDOWN_SECONDS = 120; // 2 minutes

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/reset-password');

  const handleSignOut = useCallback(async () => {
    setShowWarning(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      const supabase = createAdminBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore signout error on timeout
    }
    router.push('/login?reason=idle_timeout');
  }, [router]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setSecondsRemaining(COUNTDOWN_SECONDS);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isAuthPage) return;

    timerRef.current = setTimeout(() => {
      // Trigger warning dialog
      setShowWarning(true);
      setSecondsRemaining(COUNTDOWN_SECONDS);

      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleSignOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARNING_MS);
  }, [isAuthPage, handleSignOut]);

  useEffect(() => {
    if (isAuthPage) {
      setShowWarning(false);
      return;
    }

    resetTimer();

    // Throttled activity listener
    let lastHandled = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Only throttle if warning is NOT currently showing
      if (!showWarning && now - lastHandled > 5000) {
        lastHandled = now;
        resetTimer();
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isAuthPage, resetTimer, showWarning]);

  return (
    <>
      {children}
      <Dialog open={showWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle>Session Inactivity Warning</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  You have been inactive for 28 minutes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            For security, your admin session will automatically terminate in{' '}
            <strong className="text-foreground font-semibold font-mono text-base">
              {Math.floor(secondsRemaining / 60)}:
              {String(secondsRemaining % 60).padStart(2, '0')}
            </strong>
            .
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground"
            >
              Sign out now
            </Button>
            <Button size="sm" onClick={resetTimer}>
              Stay Logged In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
