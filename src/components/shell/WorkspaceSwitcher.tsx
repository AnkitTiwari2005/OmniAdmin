'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WORKSPACES, OVERVIEW_CONFIG } from '@/lib/workspace';
import type { WorkspaceSlug, DashboardWorkspaceSlug, WorkspaceConfig } from '@/lib/workspace';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check, LayoutGrid } from 'lucide-react';

interface WorkspaceSwitcherProps {
  currentSlug: DashboardWorkspaceSlug;
  collapsed: boolean;
  allowedWorkspaces: WorkspaceSlug[];
}

export function WorkspaceSwitcher({
  currentSlug,
  collapsed,
  allowedWorkspaces,
}: WorkspaceSwitcherProps) {
  const current: WorkspaceConfig =
    currentSlug === 'overview'
      ? OVERVIEW_CONFIG
      : WORKSPACES.find((w) => w.slug === currentSlug) || OVERVIEW_CONFIG;

  const Icon = current.icon;
  const router = useRouter();
  const isOverview = currentSlug === 'overview';

  const available = WORKSPACES.filter((w) => allowedWorkspaces.includes(w.slug));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center text-white transition-all duration-200 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs hover:shadow-md active:scale-[0.98]',
            collapsed
              ? 'h-10 w-10 p-0 rounded-xl justify-center mx-auto shrink-0'
              : 'w-full gap-2.5 rounded-xl p-2.5 justify-between'
          )}
          style={{ backgroundColor: current.accentHex }}
          title={collapsed ? current.name : undefined}
          aria-label={current.name}
        >
          {collapsed ? (
            <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 hover:scale-110" />
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-2xs">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold leading-none">{current.name}</p>
                  <p className="mt-1 truncate text-[11px] text-white/75 font-normal">{current.description}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-white/75 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-60 glass-card rounded-xl p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
          Switch Workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allowedWorkspaces.length > 1 && (
          <>
            <DropdownMenuItem
              onClick={() => router.push('/overview')}
              className="flex items-center gap-3 cursor-pointer rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-muted/80 focus:bg-muted/80"
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: OVERVIEW_CONFIG.accentHex + '20' }}
              >
                <LayoutGrid className="h-4 w-4" style={{ color: OVERVIEW_CONFIG.accentHex }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">All Businesses</p>
                <p className="text-[11px] text-muted-foreground truncate">Cross-portfolio overview</p>
              </div>
              {isOverview && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {available.map((ws) => {
          const WsIcon = ws.icon;
          const isSelected = ws.slug === currentSlug;
          return (
            <DropdownMenuItem
              key={ws.slug}
              onClick={() => router.push(`/${ws.slug}`)}
              className="flex items-center gap-3 cursor-pointer rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-muted/80 focus:bg-muted/80"
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: ws.accentHex + '20' }}
              >
                <WsIcon className="h-4 w-4" style={{ color: ws.accentHex }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{ws.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ws.description}</p>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
