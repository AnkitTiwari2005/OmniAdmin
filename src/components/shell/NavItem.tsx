'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/workspace';

interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
  accentHex: string;
}

export function SidebarNavItem({ item, collapsed, accentHex }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
        isActive
          ? 'text-white shadow-xs font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-[0.98]'
      )}
      style={isActive ? { backgroundColor: accentHex } : undefined}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={cn(
        'h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110',
        isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
      )} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
