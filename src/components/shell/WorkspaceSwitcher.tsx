'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WORKSPACES } from '@/lib/workspace';
import type { WorkspaceSlug } from '@/lib/workspace';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

interface WorkspaceSwitcherProps {
  currentSlug: WorkspaceSlug;
  collapsed: boolean;
  allowedWorkspaces: WorkspaceSlug[];
}

export function WorkspaceSwitcher({
  currentSlug,
  collapsed,
  allowedWorkspaces,
}: WorkspaceSwitcherProps) {
  const current = WORKSPACES.find((w) => w.slug === currentSlug)!;
  const Icon = current.icon;
  const router = useRouter();

  const available = WORKSPACES.filter((w) => allowedWorkspaces.includes(w.slug));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-xl p-3 text-white transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            collapsed ? 'justify-center' : 'justify-between'
          )}
          style={{ backgroundColor: current.accentHex }}
          title={collapsed ? current.name : undefined}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Icon className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold leading-none">{current.name}</p>
                <p className="mt-0.5 truncate text-xs text-white/70">{current.description}</p>
              </div>
            )}
          </div>
          {!collapsed && <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Switch Workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map((ws) => {
          const WsIcon = ws.icon;
          const isSelected = ws.slug === currentSlug;
          return (
            <DropdownMenuItem
              key={ws.slug}
              onClick={() => router.push(`/${ws.slug}`)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: ws.accentHex + '20' }}
              >
                <WsIcon className="h-4 w-4" style={{ color: ws.accentHex }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{ws.name}</p>
                <p className="text-xs text-muted-foreground truncate">{ws.description}</p>
              </div>
              {isSelected && <Check className="h-4 w-4 text-muted-foreground" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
