import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// jsdom does not implement window.matchMedia (see https://github.com/jsdom/jsdom/issues/3232).
// next-themes calls it when `enableSystem` is set, so polyfill it for tests.
// `configurable: true` lets individual tests redefine/stub this per-test (e.g. via
// vi.stubGlobal) to simulate a dark/light OS preference.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
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

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.className = ""
})
