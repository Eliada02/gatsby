import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stopped changing for `delayMs`.
 *
 * Used to feed live regions from rapidly changing input. A screen reader
 * announcing every intermediate value while a slider is dragged is unusable
 * noise, so the visible figures update immediately and the announcement waits
 * until the user pauses.
 *
 * The same pattern applies to search-as-you-type, where announcing a result
 * count on every keystroke has the identical problem.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    // Clearing on every change is what makes this a debounce rather than a
    // delay: only the final value in a burst survives to be applied.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
