import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import { NavMain, navMainItems } from '@/components/nav-main';
import { QuickCreateProvider } from '@/components/quick-create-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

function renderNavMain() {
  return render(
    <QuickCreateProvider>
      <SidebarProvider>
        <NavMain items={navMainItems} />
      </SidebarProvider>
    </QuickCreateProvider>,
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

  it('renders "Quick Create" as an enabled button that signals a request to open the add-book form', async () => {
    const user = userEvent.setup();
    pathname = '/';
    renderNavMain();

    const button = screen.getByRole('button', { name: /Quick Create/ });
    expect(button).toBeEnabled();

    // No listener is registered in this render (that's books-dashboard's
    // job) — clicking should be a no-op, not throw.
    await user.click(button);
  });

  it('renders the decorative icon next to "Quick Create" as inert', async () => {
    const user = userEvent.setup();
    pathname = '/';
    const { container } = renderNavMain();

    const decorative = container.querySelector('span[aria-hidden="true"]');
    expect(decorative).not.toBeNull();
    // A plain `<span>`, not a `<button>`/`<a>` — no click target, no
    // tabIndex making it keyboard-focusable, no role for it to fake.
    expect(decorative?.tagName).toBe('SPAN');
    expect(decorative).not.toHaveAttribute('tabindex');
    expect(decorative).not.toHaveAttribute('role');

    // Clicking it is a no-op, not a hidden trigger for something else.
    await user.click(decorative as Element);
  });
});
