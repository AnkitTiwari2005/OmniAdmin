'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { SidebarNavItem } from './NavItem';
import { cn } from '@/lib/utils';
import { WORKSPACES, OVERVIEW_CONFIG } from '@/lib/workspace';
import type { WorkspaceSlug, DashboardWorkspaceSlug } from '@/lib/workspace';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  workspaceSlug: DashboardWorkspaceSlug;
  adminRole: string;
  allowedWorkspaces: WorkspaceSlug[];
}

export function Sidebar({ workspaceSlug, adminRole, allowedWorkspaces }: SidebarProps) {
  // Look up workspace config on the client — avoids passing non-serializable icon components from Server
  const workspace =
    workspaceSlug === 'overview'
      ? OVERVIEW_CONFIG
      : WORKSPACES.find((w) => w.slug === workspaceSlug) || OVERVIEW_CONFIG;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = workspace.nav.filter((item) => {
    if (item.href === '/team' && adminRole !== 'super_admin') return false;
    return true;
  });

  const availableWorkspaces = WORKSPACES.filter((w) => allowedWorkspaces.includes(w.slug));

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-border/50 bg-card/85 backdrop-blur-xl transition-all duration-300 shrink-0 z-20',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Workspace switcher */}
      <div className="p-3">
        <WorkspaceSwitcher
          currentSlug={workspace.slug as DashboardWorkspaceSlug}
          collapsed={collapsed}
          allowedWorkspaces={allowedWorkspaces}
        />
      </div>

      <Separator className="bg-border/50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              accentHex={workspace.accentHex}
            />
          ))}

          {/* Quick Workspace Switcher for Overview mode */}
          {workspaceSlug === 'overview' && (
            <>
              <div className="pt-4 pb-1 px-2">
                {!collapsed && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Workspaces
                  </p>
                )}
              </div>
              {availableWorkspaces.map((ws) => (
                <SidebarNavItem
                  key={ws.slug}
                  item={{
                    label: ws.name,
                    href: `/${ws.slug}`,
                    icon: ws.icon,
                  }}
                  collapsed={collapsed}
                  accentHex={ws.accentHex}
                />
              ))}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('w-full justify-center text-muted-foreground', collapsed && 'px-0')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
