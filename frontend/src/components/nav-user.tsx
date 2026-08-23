import { UserRound } from 'lucide-react';

import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';

/**
 * Static, non-interactive account placeholder for the sidebar footer.
 *
 * There is no authentication in this app yet, so this intentionally renders
 * as a plain `div` (not a button/menu trigger) — it must not imply any
 * working menu or account action.
 */
export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 p-2 text-left text-xs">
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
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
