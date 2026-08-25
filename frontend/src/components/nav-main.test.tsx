import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import { NavMain, navMainItems } from '@/components/nav-main';
import { SidebarProvider } from '@/components/ui/sidebar';

function renderNavMain() {
  return render(
    <SidebarProvider>
      <NavMain items={navMainItems} />
    </SidebarProvider>,
  );
}

describe('NavMain', () => {
  it('renders the real nav item as an active link when on its route', () => {
    pathname = '/';
    renderNavMain();

    const link = screen.getByRole('link', { name: 'Библиотека книг' });
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveAttribute('data-active');
  });

  it("doesn't mark the real nav item active on another route", () => {
    pathname = '/unknown';
    renderNavMain();

    expect(
      screen.getByRole('link', { name: 'Библиотека книг' }),
    ).not.toHaveAttribute('data-active');
  });

  it('renders the dashboard-01 placeholder items as disabled, not links', () => {
    pathname = '/';
    renderNavMain();

    for (const title of ['Жизненный цикл', 'Аналитика', 'Проекты', 'Команда']) {
      const item = screen.getByText(title).closest('button');
      expect(item).toBeDisabled();
    }

    // Only the one real item should ever show up as a link.
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('renders "Quick Create" as a disabled, non-functional button', () => {
    pathname = '/';
    renderNavMain();

    expect(screen.getByRole('button', { name: /Quick Create/ })).toBeDisabled();
  });
});
