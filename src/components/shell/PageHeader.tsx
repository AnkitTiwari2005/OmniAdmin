import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  icon?: ReactNode;
}

export function PageHeader({ title, description, badge, action, breadcrumbs, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 px-6 pt-6 pb-2 animate-in fade-in-50 duration-300">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="font-medium hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="shrink-0 mt-0.5">{icon}</div>
          )}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                {title}
              </h1>
              {badge && (
                <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1.5 text-sm text-muted-foreground font-normal leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {action && (
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
