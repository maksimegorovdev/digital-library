import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import { SiteHeader } from '@/components/site-header';
import { SidebarProvider } from '@/components/ui/sidebar';

describe('SiteHeader', () => {
  it("shows the active nav item's title", () => {
    pathname = '/';
    render(
      <SidebarProvider>
        <SiteHeader />
      </SidebarProvider>,
    );

    expect(screen.getByText('Библиотека книг')).toBeInTheDocument();
  });

  it('shows no section title for an unknown route', () => {
    pathname = '/unknown';
    render(
      <SidebarProvider>
        <SiteHeader />
      </SidebarProvider>,
    );

    expect(screen.queryByText('Библиотека книг')).not.toBeInTheDocument();
  });
});
