import {
  CircleHelp,
  Database,
  FileChartColumn,
  FileText,
  Search,
  Settings,
} from 'lucide-react';
import type { ComponentProps } from 'react';

import { NavMain, navMainItems } from '@/components/nav-main';
import {
  NavDocuments,
  type NavDocumentsItem,
} from '@/components/nav-documents';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { OrgSwitcher } from '@/components/org-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';

const navSecondaryItems = [
  { title: 'Настройки', icon: Settings },
  { title: 'Справка', icon: CircleHelp },
  { title: 'Поиск', icon: Search },
];

// dashboard-01's "Documents" section (Data Library/Reports/Word Assistant),
// translated to Russian — see NavDocuments for why these are disabled
// placeholders, not real items.
const navDocumentsItems: NavDocumentsItem[] = [
  { title: 'Библиотека данных', icon: Database },
  { title: 'Отчёты', icon: FileChartColumn },
  { title: 'Текстовый помощник', icon: FileText },
];

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
    >
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavDocuments items={navDocumentsItems} />
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
