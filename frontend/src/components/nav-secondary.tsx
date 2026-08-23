import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export type NavSecondaryItem = {
  title: string;
  icon: LucideIcon;
};

// Deliberately non-functional: no href, no onClick, rendered `disabled` —
// these exist only to match dashboard-01's visual density (see
// docs/adr/0002-deliberate-non-functional-nav-placeholders.md). Do not wire
// them up to a real route without also removing that ADR's rationale.
export function NavSecondary({
  items,
  ...props
}: { items: NavSecondaryItem[] } & ComponentProps<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                size="sm"
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
