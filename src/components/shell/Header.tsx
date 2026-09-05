'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AdminProfile } from '@/lib/supabase/admin-browser';
import { useRouter } from 'next/navigation';
import { createAdminBrowserClient } from '@/lib/supabase/admin-browser';
import { CommandPalette } from '@/components/shell/CommandPalette';

interface HeaderProps {
  admin: AdminProfile;
  workspaceName: string;
  accentHex: string;
}

export function Header({ admin, workspaceName, accentHex }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const initials = (admin.full_name ?? admin.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    const supabase = createAdminBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl transition-all">
        {/* Workspace breadcrumb with live connectivity indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: accentHex }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full shadow-xs"
              style={{ backgroundColor: accentHex }}
            />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground/90">
            {workspaceName}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* Centre: Cmd+K search trigger (Linear / Raycast aesthetic) */}
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
          }}
          className="group hidden md:flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted/70 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 justify-between"
          aria-label="Search pages and commands"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="group-hover:text-foreground transition-colors font-normal">Quick search...</span>
          </div>
          <kbd className="flex items-center gap-0.5 rounded-md border border-border/80 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-2xs">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>

        {/* Right: theme toggle + user profile menu */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 rounded-lg hover:bg-muted/80 transition-colors"
            title="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-2.5 rounded-xl hover:bg-muted/70 focus-visible:ring-1">
                <Avatar className="h-7 w-7 ring-2 ring-border/50 transition-transform hover:scale-105">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{ backgroundColor: accentHex + '20', color: accentHex }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="text-xs font-semibold leading-none truncate max-w-[120px]">
                    {admin.full_name ?? admin.email.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal capitalize mt-0.5">
                    {admin.role.replace('_', ' ')}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card rounded-xl p-1.5 shadow-xl">
              <DropdownMenuLabel className="px-2.5 py-2">
                <p className="font-semibold text-sm">{admin.full_name ?? 'Admin'}</p>
                <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">{admin.email}</p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {admin.role.replace('_', ' ')}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {admin.role === 'super_admin' && (
                <DropdownMenuItem onClick={() => router.push('/overview')} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium">
                  Overview
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => router.push('/activity')} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium">
                Activity Log
              </DropdownMenuItem>
              {admin.role === 'super_admin' && (
                <DropdownMenuItem onClick={() => router.push('/team')} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium">
                  Team Management
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
