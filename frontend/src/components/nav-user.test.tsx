import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { NavUser } from '@/components/nav-user';
import { SidebarProvider } from '@/components/ui/sidebar';

function renderNavUser() {
  return render(
    <SidebarProvider>
      <NavUser />
    </SidebarProvider>,
  );
}

describe('NavUser', () => {
  it('opens the menu and shows every item as disabled', async () => {
    const user = userEvent.setup();
    renderNavUser();

    await user.click(screen.getByRole('button', { name: /Гость/ }));

    expect(
      await screen.findByRole('menuitem', { name: /Аккаунт/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('menuitem', { name: /Уведомления/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: /Выйти/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
