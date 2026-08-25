import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CircleHelp, Search, Settings } from 'lucide-react';

import { NavSecondary } from '@/components/nav-secondary';
import { SidebarProvider } from '@/components/ui/sidebar';

const items = [
  { title: 'Настройки', icon: Settings },
  { title: 'Справка', icon: CircleHelp },
  { title: 'Поиск', icon: Search },
];

describe('NavSecondary', () => {
  it('renders every item — including the new "Поиск" entry — as a disabled, non-functional button', () => {
    render(
      <SidebarProvider>
        <NavSecondary items={items} />
      </SidebarProvider>,
    );

    for (const item of items) {
      const button = screen.getByText(item.title).closest('button');
      expect(button).toBeDisabled();
    }

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
