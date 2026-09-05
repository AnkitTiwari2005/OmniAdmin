import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in-50">
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">{description}</p>
      )}
      {action && (
        <div className="mt-2">
          {action.href ? (
            <Link href={action.href}>
              <Button size="sm" variant="outline" className="text-xs">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="outline" onClick={action.onClick} className="text-xs">
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
