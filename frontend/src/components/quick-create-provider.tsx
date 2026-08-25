'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type QuickCreateContextValue = {
  /**
   * Signals a request to open the add-book form in "add" mode (no book
   * being edited). Called by the persistent shell's "Quick Create" button
   * (see nav-main.tsx) — has no effect if nothing is currently listening.
   */
  requestAddBook: () => void;
  /**
   * Registers the page-level handler that actually opens the form.
   * Returns an unsubscribe function. Prefer `useAddBookRequestHandler`
   * below over calling this directly — see its doc comment for why.
   */
  registerAddBookHandler: (handler: () => void) => () => void;
};

// This app is single-route: the add-book form's open/editing state lives
// in the page-level BooksDashboard, but the button that should open it
// ("Quick Create") lives in the persistent shell (sidebar, mounted in
// app/layout.tsx). Rather than lifting the form state up to the layout or
// reaching for a state manager, this context is a lightweight signal
// connecting the two: the shell calls `requestAddBook()`, and whichever
// page is mounted decides what that means by registering a handler via
// `useAddBookRequestHandler`.
const QuickCreateContext = createContext<QuickCreateContextValue | null>(null);

export function QuickCreateProvider({ children }: { children: ReactNode }) {
  // Single slot: this app is single-route, so exactly one handler (from
  // books-dashboard.tsx) is ever registered at a time. If a second
  // registration happens while one is already active, the newer one wins —
  // consistent with the unregister-on-unmount pattern below, where the
  // previous page's cleanup would otherwise clobber the new page's handler.
  const handlerRef = useRef<(() => void) | null>(null);

  const requestAddBook = useCallback(() => {
    handlerRef.current?.();
  }, []);

  const registerAddBookHandler = useCallback((handler: () => void) => {
    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) {
        handlerRef.current = null;
      }
    };
  }, []);

  const value = useMemo(
    () => ({ requestAddBook, registerAddBookHandler }),
    [requestAddBook, registerAddBookHandler],
  );

  return (
    <QuickCreateContext.Provider value={value}>
      {children}
    </QuickCreateContext.Provider>
  );
}

export function useQuickCreate(): QuickCreateContextValue {
  const context = useContext(QuickCreateContext);
  if (!context) {
    throw new Error('useQuickCreate must be used within a QuickCreateProvider');
  }
  return context;
}

// `useLayoutEffect` on the client, `useEffect` on the server (where
// `useLayoutEffect` is a no-op and logs a warning) — see
// useAddBookRequestHandler below for why this timing matters.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Registers `handler` as the page-level target of "Quick Create" (see
 * quick-create-provider.tsx's module doc comment). Call this once from
 * whichever component owns the add-book form's state — currently
 * books-dashboard.tsx.
 *
 * Uses `useLayoutEffect` rather than a plain `useEffect` deliberately:
 * "Quick Create"'s onClick is wired up during the same hydration commit
 * as this registration, but a plain `useEffect` doesn't run until after
 * the browser has had a chance to paint — a (normally imperceptible, but
 * real) window where a click lands after the button is interactive but
 * before this handler is registered, silently no-oping the click. A
 * layout effect commits synchronously in the same phase as the event
 * listener, closing that gap.
 *
 * `handler` is expected to be stable (e.g. wrapped in `useCallback` with
 * an empty dependency array, as books-dashboard.tsx does) — it's a
 * dependency of the underlying effect, so a new identity on every render
 * would re-subscribe every render instead of once.
 */
export function useAddBookRequestHandler(handler: () => void): void {
  const { registerAddBookHandler } = useQuickCreate();

  useIsomorphicLayoutEffect(
    () => registerAddBookHandler(handler),
    [registerAddBookHandler, handler],
  );
}
