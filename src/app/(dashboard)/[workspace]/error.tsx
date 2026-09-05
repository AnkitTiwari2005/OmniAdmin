'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const workspace = typeof params?.workspace === 'string' ? params.workspace : 'dashboard';

  useEffect(() => {
    console.error('Workspace error caught:', error);
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
            An unexpected error occurred while loading this view in <strong>{workspace}</strong>.
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
            <Link href={`/${workspace}`}>
              <LayoutDashboard className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
