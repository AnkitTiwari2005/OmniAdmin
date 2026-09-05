// ============================================================
// src/lib/workspace.ts
//
// Central workspace registry — the single source of truth for
// workspace metadata (name, slug, accent color, nav items).
// The sidebar and switcher read from this file.
//
// To add a fourth project:
//   1. Add a new entry to the WORKSPACES array.
//   2. Create src/lib/supabase/<slug>.ts  (server client)
//   3. Create src/integrations/<slug>/    (types + query fns)
//   4. Create src/app/(dashboard)/<slug>/ (pages)
//   That's it — nav auto-generates from this config.
// ============================================================

import {
  ShoppingBag,
  Home,
  HardHat,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  Wrench,
  Calendar,
  Tag,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type WorkspaceSlug = 'shudhham' | 'houserve' | 'buildkart';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface WorkspaceConfig {
  slug: WorkspaceSlug;
  name: string;
  description: string;
  /** Tailwind class for the accent color background */
  accentBg: string;
  /** Tailwind class for the accent color text */
  accentText: string;
  /** Hex color for charts and misc usage */
  accentHex: string;
  /** Lucide icon for the workspace */
  icon: LucideIcon;
  nav: NavItem[];
}

export const WORKSPACES: WorkspaceConfig[] = [
  {
    slug: 'shudhham',
    name: 'Shudhham',
    description: 'Ayurveda & naturopathy e-commerce',
    accentBg: 'bg-[#2D6A4F]',
    accentText: 'text-[#2D6A4F]',
    accentHex: '#2D6A4F',
    icon: ShoppingBag,
    nav: [
      { label: 'Dashboard', href: '/shudhham', icon: LayoutDashboard },
      { label: 'Orders', href: '/shudhham/orders', icon: ShoppingCart },
      { label: 'Products', href: '/shudhham/products', icon: Package },
      { label: 'Customers', href: '/shudhham/customers', icon: Users },
      { label: 'Payments', href: '/shudhham/payments', icon: CreditCard },
    ],
  },
  {
    slug: 'houserve',
    name: 'Houserve',
    description: 'Home-services marketplace',
    accentBg: 'bg-[#0369A1]',
    accentText: 'text-[#0369A1]',
    accentHex: '#0369A1',
    icon: Home,
    nav: [
      { label: 'Dashboard', href: '/houserve', icon: LayoutDashboard },
      { label: 'Bookings', href: '/houserve/bookings', icon: Calendar },
      { label: 'Services', href: '/houserve/services', icon: Wrench },
      { label: 'Promotions', href: '/houserve/promotions', icon: Sparkles },
      { label: 'Technicians', href: '/houserve/technicians', icon: Users },
      { label: 'Customers', href: '/houserve/customers', icon: Users },
      { label: 'Payments', href: '/houserve/payments', icon: CreditCard },
    ],
  },
  {
    slug: 'buildkart',
    name: 'BuildKart',
    description: 'Building-materials marketplace',
    accentBg: 'bg-[#D97706]',
    accentText: 'text-[#D97706]',
    accentHex: '#D97706',
    icon: HardHat,
    nav: [
      { label: 'Dashboard', href: '/buildkart', icon: LayoutDashboard },
      { label: 'Orders', href: '/buildkart/orders', icon: ShoppingCart },
      { label: 'Products', href: '/buildkart/products', icon: Package },
      { label: 'Categories', href: '/buildkart/categories', icon: Tag },
      { label: 'Customers', href: '/buildkart/customers', icon: Users },
      { label: 'Payments', href: '/buildkart/payments', icon: CreditCard },
    ],
  },
];

export function getWorkspace(slug: string): WorkspaceConfig {
  const ws = WORKSPACES.find((w) => w.slug === slug);
  if (!ws) throw new Error(`Unknown workspace: ${slug}`);
  return ws;
}

export function getWorkspaceOrNull(slug: string): WorkspaceConfig | null {
  return WORKSPACES.find((w) => w.slug === slug) ?? null;
}

export const DEFAULT_WORKSPACE: WorkspaceSlug = 'shudhham';
