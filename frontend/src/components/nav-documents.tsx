import {
  DisabledNavMenuItem,
  type DisabledNavItem,
} from '@/components/nav-disabled-item';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar';

export type NavDocumentsItem = DisabledNavItem;

// dashboard-01's "Documents" section (Data Library/Reports/Word Assistant),
// translated to Russian. Deliberately non-functional — same disabled-
// placeholder pattern as NavSecondary/NavUser (see
// docs/adr/0002-deliberate-non-functional-nav-placeholders.md and
// docs/adr/0005-dashboard-01-full-chrome-placeholder-nav.md). No href, no
// onClick, rendered `disabled`. The block's per-item hover "..." menu
// (Open/Share/Delete) isn't reproduced — those actions don't exist for
// these items either, and adding a second layer of fake affordances on top
// of an already-fake row doesn't buy any visual parity that matters here.
export function NavDocuments({ items }: { items: NavDocumentsItem[] }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Документы</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <DisabledNavMenuItem
              key={item.title}
              item={item}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
