import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { OrgSwitcher } from '@/components/org-switcher';
import { SidebarProvider } from '@/components/ui/sidebar';

function renderOrgSwitcher() {
  return render(
    <SidebarProvider>
      <OrgSwitcher />
    </SidebarProvider>,
  );
}

describe('OrgSwitcher', () => {
  it('shows the brand text on the trigger', () => {
    renderOrgSwitcher();

    expect(
      screen.getByRole('button', { name: /Библиотека[\s\S]*Егорова Петра/ }),
    ).toBeInTheDocument();
  });

  it('opens a dropdown with a disabled entry — no real org switching', async () => {
    const user = userEvent.setup();
    renderOrgSwitcher();

    await user.click(
      screen.getByRole('button', { name: /Библиотека[\s\S]*Егорова Петра/ }),
    );

    expect(
      await screen.findByRole('menuitem', {
        name: 'Библиотека Егорова Петра',
      }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
