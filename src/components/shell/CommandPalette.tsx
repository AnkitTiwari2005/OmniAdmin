'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { WORKSPACES } from '@/lib/workspace';
import {
  LayoutDashboard, ShoppingCart, Calendar, Package,
  Wrench, Users, CreditCard, Tag, Search, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  href: string;
  group: string;
  icon: LucideIcon;
  keywords?: string;
}

// Build the full command list from workspace configs
function buildItems(): CommandItem[] {
  const items: CommandItem[] = [];
  for (const ws of WORKSPACES) {
    items.push({
      id: `${ws.slug}-dashboard`,
      label: `${ws.name} — Dashboard`,
      href: `/${ws.slug}`,
      group: ws.name,
      icon: LayoutDashboard,
      keywords: `dashboard home overview ${ws.slug}`,
    });
    for (const nav of ws.nav.slice(1)) {
      items.push({
        id: `${ws.slug}-${nav.href}`,
        label: `${ws.name} — ${nav.label}`,
        href: nav.href,
        group: ws.name,
        icon: nav.icon,
        keywords: `${nav.label.toLowerCase()} ${ws.slug}`,
      });
    }
  }
  return items;
}

const ALL_ITEMS = buildItems();

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const runCommand = useCallback((href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  }, [router]);

  if (!open) return null;

  // Group items
  const groups = WORKSPACES.map((ws) => ({
    label: ws.name,
    accentHex: ws.accentHex,
    items: ALL_ITEMS.filter((i) => i.group === ws.name).filter((i) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return i.label.toLowerCase().includes(q) || (i.keywords ?? '').includes(q);
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery(''); }}
        aria-hidden="true"
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20vh] z-50 w-full max-w-lg -translate-x-1/2">
        <Command
          className="rounded-2xl border bg-card shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages…"
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto py-2 px-2">
            {groups.length === 0 && (
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </Command.Empty>
            )}

            {groups.map((group) => (
              <Command.Group
                key={group.label}
                heading={group.label}
                className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[11px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider [&>[cmdk-group-heading]]:text-muted-foreground"
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={() => runCommand(item.href)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors
                        aria-selected:bg-muted/60 hover:bg-muted/40"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-aria-selected:opacity-100" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer hint */}
          <div className="border-t px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">↵</kbd> go</span>
            <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd> close</span>
            <span className="ml-auto"><kbd className="rounded bg-muted px-1 py-0.5 font-mono">⌘K</kbd> toggle</span>
          </div>
        </Command>
      </div>
    </>
  );
}
