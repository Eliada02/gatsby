import type { PageProps } from 'gatsby';

/**
 * Builds the PageProps Gatsby supplies at runtime.
 *
 * Gatsby's PageProps has nine required fields, almost none of which a page
 * component reads. Constructing them by hand in every test would bury the
 * assertion under setup, so this fills in inert defaults and lets a test
 * override only what it cares about — usually `location.search` and
 * `pageContext`.
 *
 * The cast is contained here rather than repeated at each call site.
 */
export function makePageProps<TData = object, TContext = object>(
  overrides: Partial<PageProps<TData, TContext>> = {},
): PageProps<TData, TContext> {
  const base = {
    path: '/',
    uri: '/',
    location: { search: '', pathname: '/', hash: '', href: 'http://localhost/' } as Location,
    pageContext: {} as TContext,
    children: undefined,
    params: {},
    data: {} as TData,
    serverData: undefined,
    pageResources: undefined,
  };

  return { ...base, ...overrides } as PageProps<TData, TContext>;
}
