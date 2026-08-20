import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// jsdom does not implement window.matchMedia (see https://github.com/jsdom/jsdom/issues/3232).
// next-themes calls it when `enableSystem` is set, so polyfill it for tests.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}
