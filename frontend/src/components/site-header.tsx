'use client';

import { usePathname } from 'next/navigation';

import { navMainItems } from '@/components/nav-main';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function SiteHeader() {
  const pathname = usePathname();
  const activeItem = navMainItems.find((item) => item.url === pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger
          className="-ml-1"
          aria-label="Переключить боковую панель"
        />
        {/*
          `self-center!` forces the override: the primitive's own
          `data-vertical:self-stretch` compiles to a selector qualified by
          `[data-vertical]`, which has higher specificity than a bare
          `self-center` class, so an unforced override silently loses and
          the separator falls back to flex-start (with a definite height,
          "stretch" resolves to "start" rather than filling the cross
          axis) instead of being vertically centered in the header.
        */}
        <Separator
          orientation="vertical"
          className="mx-2 h-4 self-center!"
        />
        {/*
          The active nav section's title, not a page heading — it's driven
          by the sidebar's own nav list so it stays in sync automatically,
          and each page still owns its own `<h1>` (nesting two top-level
          headings would compete for the document's single `<h1>`).
        */}
        <span className="text-base font-medium">{activeItem?.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
