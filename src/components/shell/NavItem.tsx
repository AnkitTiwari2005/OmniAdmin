'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/workspace';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
  accentHex: string;
}

export function SidebarNavItem({ item, collapsed, accentHex }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97]',
        collapsed ? 'h-10 w-10 justify-center mx-auto px-0 py-0' : 'px-3 py-2',
        isActive
          ? 'text-white shadow-sm font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
      style={isActive ? { backgroundColor: accentHex } : undefined}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active left accent bar */}
      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full opacity-0 group-hover:opacity-0"
          style={{ backgroundColor: accentHex }}
        />
      )}

      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-all duration-200',
          isActive
            ? 'text-white scale-105'
            : 'text-muted-foreground group-hover:text-foreground group-hover:scale-110'
        )}
      />
      {!collapsed && (
        <span className="truncate transition-colors duration-150">{item.label}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent
            side="right"
            className="glass-card rounded-lg px-2.5 py-1.5 text-xs font-medium border border-border/50 shadow-xl"
            sideOffset={8}
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}
