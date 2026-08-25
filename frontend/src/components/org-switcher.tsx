'use client';

import { ChevronsUpDown, Library } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

// dashboard-01's org switcher, adopted for visual parity with the block's
// full chrome (see docs/adr/0005-dashboard-01-full-chrome-placeholder-nav.md).
// This replaces the previous static branding (a plain, non-interactive
// header — see git history) with a dropdown trigger that shows the same
// brand text, but there is still only one product here: the dropdown's one
// entry is the current library itself, disabled, not a real org list. No
// switching happens — this is a no-op, deliberately, like NavSecondary and
// NavUser (docs/adr/0002-deliberate-non-functional-nav-placeholders.md).
export function OrgSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              >
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center">
                  <Library className="size-4" />
                </span>
                <div className="grid flex-1 leading-tight">
                  <span className="truncate font-medium">Библиотека</span>
                  <span className="truncate font-medium">Егорова Петра</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="min-w-56"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Библиотеки
              </DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <Library />
                Библиотека Егорова Петра
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
