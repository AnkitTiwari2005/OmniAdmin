import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs',
        secondary: 'border-border/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive dark:bg-destructive/20 hover:bg-destructive/20',
        outline: 'border-border/70 text-foreground bg-background/50 backdrop-blur-sm',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/15',
        warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/15',
        info: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400 dark:bg-sky-500/15',
        indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 dark:bg-indigo-500/15',
        purple: 'border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-400 dark:bg-purple-500/15',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
  dotColor?: string;
}

function Badge({ className, variant, dot, pulse, dotColor, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                dotColor ?? 'bg-current'
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex h-1.5 w-1.5 rounded-full',
              dotColor ?? 'bg-current'
            )}
          />
        </span>
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
