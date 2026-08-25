'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartBar,
  CirclePlus,
  Folder,
  Library,
  List,
  Mail,
  Users,
  type LucideIcon,
} from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

// Shared with SiteHeader, which shows the active item's title next to the
// sidebar trigger instead of a static app name. This list holds only real,
// routed entries — see navMainPlaceholderItems below for dashboard-01's
// extra chrome, which must never end up here (SiteHeader would otherwise
// try to match a fake item against the current pathname).
export const navMainItems: NavMainItem[] = [
  { title: 'Библиотека книг', url: '/', icon: Library },
];

type NavMainPlaceholderItem = {
  title: string;
  icon: LucideIcon;
};

// dashboard-01's extra main-nav entries (Lifecycle/Analytics/Projects/Team),
// translated to Russian and kept as deliberately non-functional placeholders
// — same pattern as NavSecondary/NavUser (see
// docs/adr/0002-deliberate-non-functional-nav-placeholders.md and
// docs/adr/0005-dashboard-01-full-chrome-placeholder-nav.md). No href, no
// onClick, rendered `disabled` so they never register as links for the
// sidebar's "exactly one nav link" invariant.
export const navMainPlaceholderItems: NavMainPlaceholderItem[] = [
  { title: 'Жизненный цикл', icon: List },
  { title: 'Аналитика', icon: ChartBar },
  { title: 'Проекты', icon: Folder },
  { title: 'Команда', icon: Users },
];

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            {/*
              "Quick Create" is UI-only in this ticket — no onClick handler.
              Wiring it to the real add-book flow is a separate ticket (#35).
            */}
            <SidebarMenuButton
              disabled
              className="bg-primary text-primary-foreground min-w-8"
            >
              <CirclePlus />
              <span>Quick Create</span>
            </SidebarMenuButton>
            {/*
              Decorative icon adjacent to "Quick Create" (dashboard-01 parity
              only) — not a real control, so it isn't a `<button>` at all:
              no click target, no accessible name to fake, nothing for the
              "exactly one nav link" e2e assertion to trip over.
            */}
            <span
              aria-hidden="true"
              className="border-border bg-background flex size-8 shrink-0 items-center justify-center rounded-lg border group-data-[collapsible=icon]:opacity-0"
            >
              <Mail className="size-4" />
            </span>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={pathname === item.url}
                render={<Link href={item.url} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {navMainPlaceholderItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {/*
                No `tooltip` prop here (unlike the real items above):
                SidebarMenuButton wraps a tooltip'd trigger in Base UI's
                TooltipTrigger, which intercepts `disabled` and reports it
                as `data-trigger-disabled` instead of a real `disabled`
                attribute (so hover/focus still reaches the trigger for the
                tooltip) — the button would stay natively clickable. Same
                reasoning as NavSecondary/NavUser, which also skip
                `tooltip` on every disabled placeholder.
              */}
              <SidebarMenuButton
                disabled
                className="text-sidebar-foreground/60"
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
