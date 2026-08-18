/**
 * Failure categories the UI can act on.
 *
 * `network` and `timeout` are worth retrying; `http` may or may not be,
 * depending on status; `parse` indicates a broken contract and retrying will
 * not help. Distinguishing them lets the interface say something accurate
 * instead of "something went wrong".
 */
export type ApiErrorCode = 'network' | 'timeout' | 'http' | 'parse' | 'aborted';

/**
 * A failed request.
 *
 * Errors are never swallowed: every failure path throws one of these with a
 * code, so the caller must handle it and the state machine can record why.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | undefined;

  constructor(message: string, code: ApiErrorCode, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }

  /** Whether trying the same request again could plausibly succeed. */
  get isRetryable(): boolean {
    if (this.code === 'network' || this.code === 'timeout') return true;
    // 5xx may be transient; 4xx means the request itself was wrong.
    return this.code === 'http' && this.status !== undefined && this.status >= 500;
  }
}

/**
 * Message shown to a person.
 *
 * Deliberately free of status codes, URLs and stack detail: those belong in
 * logs. A reader needs to know what failed and what to do next.
 */
export function describeApiError(error: ApiError): string {
  switch (error.code) {
    case 'network':
      return 'We could not reach the resource library. Check your connection and try again.';
    case 'timeout':
      return 'The resource library took too long to respond.';
    case 'parse':
      return 'The resource library returned an unexpected response.';
    case 'aborted':
      return 'The request was cancelled.';
    case 'http':
    default:
      return 'We could not load the resource library just now.';
  }
}
