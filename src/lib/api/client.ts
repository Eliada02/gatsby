import type { ApiErrorBody } from '@/types/api';
import { ApiError } from './errors';

/**
 * Minimal typed wrapper over fetch.
 *
 * Everything the UI needs from a data-fetching library at this scale: one place
 * that owns timeouts, maps failures onto ApiError, and parses JSON. Roughly
 * fifty lines, and no dependency.
 *
 * Deliberately not implementing caching, deduplication or retry-with-backoff.
 * The project has one endpoint; at the point where those become necessary the
 * right move is to adopt a library rather than to grow this file.
 */

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Base URL for API requests.
 *
 * Relative in the browser, so the request goes to the same origin the page was
 * served from and works identically on localhost, deploy previews and
 * production. GATSBY_API_BASE_URL exists as the seam for pointing the client at
 * a separately hosted API without touching call sites.
 */
const BASE_URL = process.env.GATSBY_API_BASE_URL ?? '';

interface RequestOptions {
  /** Caller-owned cancellation, used to abandon superseded requests. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Reads the error body if the server sent one, without letting parsing throw. */
async function readErrorBody(response: Response): Promise<ApiErrorBody | undefined> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      'message' in body &&
      typeof (body as ApiErrorBody).message === 'string'
    ) {
      return body as ApiErrorBody;
    }
  } catch {
    // A non-JSON error body is normal for proxy and gateway failures.
  }
  return undefined;
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  /*
   * A single controller combines the caller's signal with the timeout.
   * AbortSignal.any would express this directly but is too recent to rely on
   * across the browsers this project targets.
   */
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const body = await readErrorBody(response);
      throw new ApiError(
        body?.message ?? `Request failed with status ${response.status}`,
        'http',
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError('Response was not valid JSON', 'parse', response.status);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;

    // fetch rejects with an AbortError for both cancellation and timeout, so
    // the two are separated by the flag set above.
    if (error instanceof Error && error.name === 'AbortError') {
      throw timedOut
        ? new ApiError('Request timed out', 'timeout')
        : new ApiError('Request was cancelled', 'aborted');
    }

    // Anything else from fetch means the request never completed: DNS failure,
    // offline, CORS rejection.
    throw new ApiError('Network request failed', 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
