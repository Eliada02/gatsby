import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/errors';
import { buildResourcesPath, getResourcesByPath } from '@/lib/api/resources';
import type { ResourceListResponse, ResourceQuery } from '@/types/api';

/**
 * Async state as a discriminated union, as recorded in docs/architecture.md.
 *
 * Three independent booleans allow `{ isLoading: true, error: Error }`, a state
 * that should be impossible. This makes illegal states unrepresentable and
 * forces the UI to handle every branch, including success with zero results —
 * so the empty state cannot be forgotten.
 */
export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

interface InitialData {
  /** Path the data corresponds to, so it is only used for a matching query. */
  key: string;
  data: ResourceListResponse;
}

interface UseResourcesResult {
  state: RequestState<ResourceListResponse>;
  /** Re-runs the current request after a failure. */
  retry: () => void;
  /** True while refetching with results already on screen. */
  isRefreshing: boolean;
}

/**
 * Loads a page of resources for the given query.
 *
 * Three behaviours worth noting:
 *
 * Requests are cancelled when the query changes. Typing in the search box
 * produces overlapping requests, and without cancellation a slow early response
 * can arrive after a fast later one and overwrite correct results with stale
 * ones. Aborting makes the most recent request the winner regardless of timing.
 *
 * Previous results stay on screen while refetching. Collapsing to a skeleton on
 * every change makes the page flicker and loses the reader's place, so
 * `isRefreshing` lets the UI dim the existing list instead.
 *
 * The effect depends only on the serialised request path, which is also what is
 * fetched. That is why no dependency needs suppressing: the path changes
 * exactly when the request should be repeated, whereas `query` is a new object
 * on every render.
 */
export function useResources(query: ResourceQuery, initialData?: InitialData): UseResourcesResult {
  const key = buildResourcesPath(query);

  const [state, setState] = useState<RequestState<ResourceListResponse>>(() =>
    initialData && initialData.key === key
      ? { status: 'success', data: initialData.data }
      : { status: 'idle' },
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /*
   * Read inside the effect to decide between a skeleton and a dimmed refresh.
   * A ref rather than a dependency, because depending on state here would
   * re-run the effect every time the request completes.
   */
  const stateRef = useRef(state);
  stateRef.current = state;

  /*
   * When the page was statically rendered with data for this exact query there
   * is nothing to fetch on mount. Any later change to the key fetches normally.
   */
  const skipInitialFetch = useRef(initialData?.key === key);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    if (stateRef.current.status === 'success') {
      setIsRefreshing(true);
    } else {
      setState({ status: 'loading' });
    }

    getResourcesByPath(key, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // A superseded request is not a failure the reader should ever see.
        if (error instanceof ApiError && error.code === 'aborted') return;
        setState({
          status: 'error',
          error: error instanceof ApiError ? error : new ApiError('Unexpected failure', 'network'),
        });
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, retry, isRefreshing };
}
