import type { Paginated, ResourceQuery, ResourceSort } from '@/types/api';
import type { Resource } from '@/types/content';

/**
 * Search, filter, sort and pagination for the resource library.
 *
 * Pure functions over an array, with no HTTP and no React. The REST handler
 * calls this; so do its tests. Keeping the logic here rather than inside the
 * endpoint means the behaviour can be tested exhaustively without a server, and
 * it stays correct if the transport ever changes.
 *
 * This runs server-side. The client never filters a full list locally, so the
 * browser only ever receives one page of results.
 */

export const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 24;

/** Matches against title, summary and tags — the fields a reader can see. */
function matchesSearch(resource: Resource, term: string): boolean {
  const haystack = [resource.title, resource.summary, ...resource.tags].join(' ').toLowerCase();
  return haystack.includes(term);
}

/**
 * Publication dates are ISO strings, so they sort lexicographically without
 * being parsed into Date objects.
 */
const COMPARATORS: Record<ResourceSort, (a: Resource, b: Resource) => number> = {
  newest: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  oldest: (a, b) => a.publishedAt.localeCompare(b.publishedAt),
  title: (a, b) => a.title.localeCompare(b.title),
};

export const DEFAULT_SORT: ResourceSort = 'newest';

/** Clamps page size so a hand-edited URL cannot request the entire library. */
function resolvePageSize(requested: number | undefined): number {
  if (requested === undefined || !Number.isFinite(requested)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(requested)));
}

export function queryResources(
  all: readonly Resource[],
  query: ResourceQuery = {},
): Paginated<Resource> {
  const term = query.q?.trim().toLowerCase();

  const filtered = all.filter((resource) => {
    if (query.category && resource.category !== query.category) return false;
    if (term && !matchesSearch(resource, term)) return false;
    return true;
  });

  // Copied before sorting: sort mutates, and `all` is the shared content module.
  const sorted = [...filtered].sort(COMPARATORS[query.sort ?? DEFAULT_SORT]);

  const pageSize = resolvePageSize(query.pageSize);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /*
   * The requested page is clamped rather than honoured literally. A URL with
   * ?page=99 then returns the last real page instead of an empty grid, and the
   * pagination controls stay consistent because they read meta.page rather than
   * the URL.
   */
  const page = Math.min(Math.max(1, Math.trunc(query.page ?? 1)), totalPages);
  const start = (page - 1) * pageSize;

  return {
    data: sorted.slice(start, start + pageSize),
    meta: { total, page, pageSize, totalPages },
  };
}
