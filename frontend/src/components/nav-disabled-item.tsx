import type { LucideIcon } from 'lucide-react';

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

// Shared shape + renderer for the sidebar's deliberately non-functional nav
// placeholders (NavSecondary, NavDocuments, NavMain's dashboard-01 extras):
// icon + label, no href, no onClick, rendered `disabled` — these exist only
// to match dashboard-01's visual density, not to be real navigation. See
// docs/adr/0002-deliberate-non-functional-nav-placeholders.md and
// docs/adr/0005-dashboard-01-full-chrome-placeholder-nav.md. Do not wire a
// call site up to a real route without also removing that ADR's rationale.
export type DisabledNavItem = {
  title: string;
  icon: LucideIcon;
};

// Deliberately doesn't accept a `tooltip` prop, unlike the real, linked
// items rendered alongside it in NavMain: SidebarMenuButton wraps a
// tooltip'd trigger in Base UI's TooltipTrigger, which intercepts `disabled`
// and reports it as `data-trigger-disabled` instead of a real `disabled`
// attribute (so hover/focus still reaches the trigger for the tooltip) —
// the button would stay natively clickable. Every call site here relies on
// staying tooltip-free to keep the disabled state real.
export function DisabledNavMenuItem({
  item,
  size,
}: {
  item: DisabledNavItem;
  size?: 'default' | 'sm' | 'lg';
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size={size}
        disabled
        className="text-sidebar-foreground/60"
      >
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
