import { CircleHelp, Library, Settings } from 'lucide-react';
import type { ComponentProps } from 'react';

import { NavMain, navMainItems } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navSecondaryItems = [
  { title: 'Настройки', icon: Settings },
  { title: 'Справка', icon: CircleHelp },
];

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/*
              Static branding, not a team switcher — there is only one
              product here, so a dropdown trigger with nothing to switch to
              would be a fake affordance (unlike the deliberate placeholders
              in NavSecondary/NavUser, see docs/adr/0002).

              No horizontal padding here (only `py-2`, unlike nav items'
              `p-2`): SidebarHeader already insets its content by `p-2`, so
              adding another `p-2` on top would inset the icon a further
              8px past where NavMain/NavSecondary's own `p-2` (inside
              SidebarGroup's `p-2`) puts their highlighted row's left edge —
              this keeps the icon flush with that edge instead.
            */}
            <div className="flex w-full items-center gap-2 py-2 text-left text-sm">
              <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center">
                <Library className="size-4" />
              </span>
              <div className="grid flex-1 leading-tight">
                <span className="truncate font-medium">Библиотека</span>
                <span className="truncate font-medium">Егорова Петра</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary
          items={navSecondaryItems}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
