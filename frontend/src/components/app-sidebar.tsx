import { Library } from 'lucide-react';
import type { ComponentProps } from 'react';

import { NavMain, type NavMainItem } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';

const navMainItems: NavMainItem[] = [
  { title: 'Библиотека книг', url: '/', icon: Library },
];

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
    >
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
