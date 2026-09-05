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
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'text-white'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
      style={isActive ? { backgroundColor: accentHex } : undefined}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
