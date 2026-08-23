import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';

function renderToggle() {
  return render(
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <ThemeToggle />
    </ThemeProvider>,
  );
}

function mockMatchMedia(matchesDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-color-scheme: dark)' ? matchesDark : !matchesDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeToggle', () => {
  it("switches to dark theme when 'Тёмная' is selected", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Переключить тему' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Тёмная' }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("switches to light theme when 'Светлая' is selected", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Переключить тему' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Тёмная' }));
    await user.click(screen.getByRole('button', { name: 'Переключить тему' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Светлая' }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it("applies the OS dark preference when 'Системная' is selected", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Переключить тему' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Системная' }),
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("applies the OS light preference when 'Системная' is selected", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Переключить тему' }));
    await user.click(
      await screen.findByRole('menuitem', { name: 'Системная' }),
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
