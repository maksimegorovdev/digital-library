import type { ComponentProps } from 'react';

import {
  DisabledNavMenuItem,
  type DisabledNavItem,
} from '@/components/nav-disabled-item';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';

export type NavSecondaryItem = DisabledNavItem;

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
            <DisabledNavMenuItem
              key={item.title}
              item={item}
              size="sm"
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
