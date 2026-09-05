'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center flex flex-col items-center gap-4 max-w-lg w-full shadow-sm">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-foreground">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-1">
            An unexpected error occurred in the dashboard.
          </p>
        </div>

        {error?.message && (
          <div className="w-full p-3 rounded-lg bg-background/80 border text-left font-mono text-xs text-muted-foreground break-words max-h-32 overflow-auto">
            {error.message}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <Button onClick={() => reset()} className="gap-2" size="sm">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
