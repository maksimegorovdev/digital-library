import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFreshFetch } from '@/hooks/use-fresh-fetch';

type Result = { ok: true; value: string } | { ok: false; error: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('useFreshFetch', () => {
  it('starts in the loading state while the fetch is in flight', () => {
    const pending = deferred<Result>();
    const fetcher = vi.fn<(page: number) => Promise<Result>>(
      () => pending.promise,
    );

    const { result } = renderHook(() => useFreshFetch(fetcher, [1] as const));

    expect(result.current).toEqual({ status: 'loading' });
    expect(fetcher).toHaveBeenCalledWith(1);
  });

  it("exposes the fetcher's success result once it resolves", async () => {
    const pending = deferred<Result>();
    const fetcher = vi.fn<(page: number) => Promise<Result>>(
      () => pending.promise,
    );

    const { result } = renderHook(() => useFreshFetch(fetcher, [1] as const));

    await act(async () => {
      pending.resolve({ ok: true, value: 'one' });
      await pending.promise;
    });

    expect(result.current).toEqual({
      status: 'success',
      ok: true,
      value: 'one',
    });
  });

  it('exposes an error result when the fetch fails', async () => {
    const pending = deferred<Result>();
    const fetcher = vi.fn<(page: number) => Promise<Result>>(
      () => pending.promise,
    );

    const { result } = renderHook(() => useFreshFetch(fetcher, [1] as const));

    await act(async () => {
      pending.resolve({ ok: false, error: 'boom' });
      await pending.promise;
    });

    expect(result.current).toEqual({
      status: 'error',
      ok: false,
      error: 'boom',
    });
  });

  it('discards a stale result that resolves after a newer request has already started', async () => {
    const first = deferred<Result>();
    const second = deferred<Result>();
    const fetcher = vi
      .fn<(page: number) => Promise<Result>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(
      ({ args }) => useFreshFetch(fetcher, args),
      { initialProps: { args: [1] as [number] } },
    );

    rerender({ args: [2] });
    expect(result.current).toEqual({ status: 'loading' });

    // The stale first request resolves after the second one has already
    // started — it must not overwrite the still-in-flight loading state.
    await act(async () => {
      first.resolve({ ok: true, value: 'stale' });
      await first.promise;
    });
    expect(result.current).toEqual({ status: 'loading' });

    await act(async () => {
      second.resolve({ ok: true, value: 'fresh' });
      await second.promise;
    });
    expect(result.current).toEqual({
      status: 'success',
      ok: true,
      value: 'fresh',
    });
  });

  it('refetches on an extraTriggers change without invalidating the currently shown result', async () => {
    const first = deferred<Result>();
    const second = deferred<Result>();
    const fetcher = vi
      .fn<(page: number) => Promise<Result>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(
      ({ trigger }) => useFreshFetch(fetcher, [1] as const, [trigger]),
      { initialProps: { trigger: 0 } },
    );

    await act(async () => {
      first.resolve({ ok: true, value: 'one' });
      await first.promise;
    });
    expect(result.current).toEqual({
      status: 'success',
      ok: true,
      value: 'one',
    });

    // Bumping the trigger (e.g. a post-save refresh) re-fetches the same
    // args, but the previously shown result stays visible — no loading
    // flash — until the refetch resolves.
    rerender({ trigger: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({
      status: 'success',
      ok: true,
      value: 'one',
    });

    await act(async () => {
      second.resolve({ ok: true, value: 'two' });
      await second.promise;
    });
    expect(result.current).toEqual({
      status: 'success',
      ok: true,
      value: 'two',
    });
  });
});
