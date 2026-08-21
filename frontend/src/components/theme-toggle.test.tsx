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
  it("switches to dark theme when 'Dark' is selected", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Dark' }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("switches to light theme when 'Light' is selected", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Dark' }));
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Light' }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it("applies the OS dark preference when 'System' is selected", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'System' }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("applies the OS light preference when 'System' is selected", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await user.click(await screen.findByRole('menuitem', { name: 'System' }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
