'use client';

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  UserRound,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

// There is no authentication in this app yet, so every item here is
// deliberately disabled — visual parity with dashboard-01's user menu, not
// real functionality. See docs/adr/0002-deliberate-non-functional-nav-placeholders.md.
export function NavUser() {
  const { isMobile } = useSidebar();

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
                <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                  <UserRound className="size-4" />
                </span>
                <div className="grid flex-1 leading-tight">
                  <span className="text-sidebar-foreground truncate font-medium">
                    Гость
                  </span>
                  <span className="text-muted-foreground truncate">
                    Аккаунт не настроен
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                    <UserRound className="size-4" />
                  </span>
                  <div className="grid flex-1 leading-tight">
                    <span className="truncate font-medium">Гость</span>
                    <span className="text-muted-foreground truncate">
                      Аккаунт не настроен
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <BadgeCheck />
                Аккаунт
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Bell />
                Уведомления
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <LogOut />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
