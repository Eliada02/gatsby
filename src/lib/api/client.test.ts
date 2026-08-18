import { ApiError, describeApiError } from './errors';
import { buildResourcesPath, getResources } from './resources';

/**
 * fetch is mocked, not getResources.
 *
 * Mocking our own module would test the mock. Replacing fetch means the request
 * building, status handling, JSON parsing and error mapping all run for real,
 * and only the network is simulated.
 */

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const emptyPage = {
  data: [],
  meta: { total: 0, page: 1, pageSize: 6, totalPages: 1 },
};

describe('buildResourcesPath', () => {
  it('omits empty and default values so equivalent queries share one key', () => {
    // The path doubles as the request cache key in useResources, so two queries
    // that mean the same thing must serialise identically.
    expect(buildResourcesPath({})).toBe('/api/resources');
    expect(buildResourcesPath({ q: '   ' })).toBe('/api/resources');
    expect(buildResourcesPath({ page: 1 })).toBe('/api/resources');
  });

  it('serialises each supported parameter', () => {
    const path = buildResourcesPath({
      q: 'fhir',
      category: 'interoperability',
      sort: 'oldest',
      page: 3,
    });

    expect(path).toContain('q=fhir');
    expect(path).toContain('category=interoperability');
    expect(path).toContain('sort=oldest');
    expect(path).toContain('page=3');
  });

  it('produces a stable key regardless of key order', () => {
    expect(buildResourcesPath({ sort: 'title', q: 'care' })).toBe(
      buildResourcesPath({ q: 'care', sort: 'title' }),
    );
  });

  it('encodes characters that would otherwise break the query string', () => {
    expect(buildResourcesPath({ q: 'a&b=c' })).toContain('q=a%26b%3Dc');
  });
});

describe('getResources', () => {
  it('returns the parsed body on success', async () => {
    mockFetch.mockResolvedValue(jsonResponse(emptyPage));

    await expect(getResources({})).resolves.toEqual(emptyPage);
    expect(mockFetch).toHaveBeenCalledWith('/api/resources', expect.anything());
  });

  it('maps a server error body onto an ApiError', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ code: 'invalid_category', message: 'Unknown category "nope".' }, 400),
    );

    await expect(getResources({})).rejects.toMatchObject({
      code: 'http',
      status: 400,
      message: 'Unknown category "nope".',
    });
  });

  it('still produces an ApiError when the error body is not JSON', async () => {
    // Gateways and proxies return HTML error pages; parsing must not throw.
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    await expect(getResources({})).rejects.toMatchObject({ code: 'http', status: 502 });
  });

  it('reports a malformed success body as a parse failure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    } as unknown as Response);

    await expect(getResources({})).rejects.toMatchObject({ code: 'parse' });
  });

  it('reports a rejected fetch as a network failure', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(getResources({})).rejects.toMatchObject({ code: 'network' });
  });

  it('distinguishes caller cancellation from other aborts', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const controller = new AbortController();
    const promise = getResources({}, { signal: controller.signal });
    controller.abort();

    // 'aborted' is what tells useResources to stay silent rather than showing
    // an error for a request the user themselves superseded.
    await expect(promise).rejects.toMatchObject({ code: 'aborted' });
  });

  it('never leaks a non-ApiError to callers', async () => {
    mockFetch.mockRejectedValue('a string, not an Error');

    await expect(getResources({})).rejects.toBeInstanceOf(ApiError);
  });
});

describe('ApiError', () => {
  it('marks transient failures as retryable and client mistakes as not', () => {
    // Drives whether the error state offers a retry button.
    expect(new ApiError('x', 'network').isRetryable).toBe(true);
    expect(new ApiError('x', 'timeout').isRetryable).toBe(true);
    expect(new ApiError('x', 'http', 503).isRetryable).toBe(true);
    expect(new ApiError('x', 'http', 400).isRetryable).toBe(false);
    expect(new ApiError('x', 'parse').isRetryable).toBe(false);
  });

  it('describes failures without exposing implementation detail', () => {
    // Status codes and URLs belong in logs, not in front of a reader.
    const message = describeApiError(new ApiError('Request failed with status 500', 'http', 500));

    expect(message).not.toMatch(/500|http|fetch|api\//i);
    expect(message.length).toBeGreaterThan(10);
  });
});
