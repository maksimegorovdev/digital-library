'use client';

import { useEffect, useState } from 'react';

type Ok<TResult> = Extract<TResult, { ok: true }>;
type Err<TResult> = Extract<TResult, { ok: false }>;

export type FreshFetchState<TResult extends { ok: boolean }> =
  | { status: 'loading' }
  | ({ status: 'success' } & Ok<TResult>)
  | ({ status: 'error' } & Err<TResult>);

type Snapshot<
  TArgs extends readonly unknown[],
  TResult extends { ok: boolean },
> = {
  args: TArgs;
  result: FreshFetchState<TResult>;
};

/**
 * Runs `fetcher(...args)` whenever an element of `args` (or of the
 * optional `extraTriggers`) changes, and exposes only the result whose
 * `args` match what's currently requested. A request that resolves after
 * a newer one has already started is discarded rather than shown, so
 * callers never flash a response for a page/filter that no longer
 * applies.
 *
 * `args` must be primitive, `===`-comparable values (e.g. a page number,
 * a search string) — they double as both the fetcher's call arguments
 * and the identity used to detect a stale result.
 *
 * `extraTriggers` also forces a refetch when one of its elements changes
 * (e.g. a "refresh" counter bumped after a save), but — unlike `args` —
 * plays no part in the identity check: what's currently shown stays
 * shown, without dropping to loading, while a same-`args` refetch caused
 * by `extraTriggers` is in flight.
 */
export function useFreshFetch<
  TArgs extends readonly unknown[],
  TResult extends { ok: boolean },
>(
  fetcher: (...args: TArgs) => Promise<TResult>,
  args: TArgs,
  extraTriggers: readonly unknown[] = [],
): FreshFetchState<TResult> {
  const [snapshot, setSnapshot] = useState<Snapshot<TArgs, TResult>>({
    args,
    result: { status: 'loading' },
  });

  useEffect(() => {
    let cancelled = false;

    fetcher(...args).then((result) => {
      if (cancelled) return;
      setSnapshot({
        args,
        result: {
          status: result.ok ? 'success' : 'error',
          ...result,
        } as FreshFetchState<TResult>,
      });
    });

    return () => {
      cancelled = true;
    };
    // `args` and `extraTriggers` together are the caller-supplied,
    // variable-length list of what should cause a refetch — already the
    // complete and correct dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...args, ...extraTriggers]);

  // Only trust the snapshot once its args match what's currently being
  // requested — otherwise we're either between requests (loading) or
  // looking at a response for args that no longer apply.
  const isCurrent =
    args.length === snapshot.args.length &&
    args.every((value, i) => value === snapshot.args[i]);

  return isCurrent ? snapshot.result : { status: 'loading' };
}
