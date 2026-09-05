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
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        {/* Workspace breadcrumb */}
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accentHex }}
            title={`${workspaceName} workspace`}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {workspaceName}
          </span>
        </div>

        {/* Centre: Cmd+K search trigger */}
        <button
          onClick={() => {
            // Trigger the palette by firing the keydown event the palette listens to
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
          }}
          className="hidden md:flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search pages…</span>
          <kbd className="ml-4 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono border">⌘K</kbd>
        </button>

        {/* Right: theme toggle + user menu */}
        <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8"
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs" style={{ backgroundColor: accentHex + '20', color: accentHex }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">
                {admin.full_name ?? admin.email.split('@')[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium">{admin.full_name ?? 'Admin'}</p>
              <p className="text-xs text-muted-foreground font-normal">{admin.email}</p>
              <p className="text-xs text-muted-foreground font-normal capitalize mt-0.5">
                {admin.role.replace('_', ' ')}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
