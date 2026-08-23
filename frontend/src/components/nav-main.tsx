'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, type LucideIcon } from 'lucide-react';

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
// sidebar trigger instead of a static app name.
export const navMainItems: NavMainItem[] = [
  { title: 'Библиотека книг', url: '/', icon: Library },
];

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
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
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
