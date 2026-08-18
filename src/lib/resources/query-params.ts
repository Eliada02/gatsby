import type { ResourceQuery, ResourceSort } from '@/types/api';
import { RESOURCE_SORTS } from '@/types/api';
import type { ResourceCategory } from '@/types/content';
import { RESOURCE_CATEGORIES } from '@/types/content';

/**
 * Translation between the browser URL and a ResourceQuery.
 *
 * The URL is the source of truth for search, category, sort and page. No
 * component keeps a second copy of those values, so refreshing the page and
 * using browser back and forward reproduce the same view by construction rather
 * than by synchronisation.
 *
 * The parameter names here are the public, linkable contract:
 *
 *   /resources?search=patient&category=digital-health&sort=newest&page=2
 *
 * They are intentionally readable rather than matching the API's internal names
 * one-to-one; `search` maps onto the endpoint's `q`. The mapping lives in this
 * module alone.
 */

export const RESOURCE_QUERY_PARAMS = {
  search: 'search',
  category: 'category',
  sort: 'sort',
  page: 'page',
} as const;

export const RESOURCES_PATH = '/resources';

export const DEFAULT_RESOURCE_SORT: ResourceSort = 'newest';

function isCategory(value: string): value is ResourceCategory {
  return (RESOURCE_CATEGORIES as readonly string[]).includes(value);
}

function isSort(value: string): value is ResourceSort {
  return (RESOURCE_SORTS as readonly string[]).includes(value);
}

/**
 * Reads a query out of a location search string.
 *
 * Unrecognised values are dropped rather than passed through. The URL is
 * user-editable, and a hand-typed category should show the full library rather
 * than an error page. The endpoint validates independently and rejects unknown
 * values, so both boundaries are defended without either trusting the other.
 */
export function parseResourceQuery(search: string): ResourceQuery {
  const params = new URLSearchParams(search);
  const query: ResourceQuery = {};

  const term = params.get(RESOURCE_QUERY_PARAMS.search)?.trim();
  if (term) query.q = term;

  const category = params.get(RESOURCE_QUERY_PARAMS.category);
  if (category && isCategory(category)) query.category = category;

  const sort = params.get(RESOURCE_QUERY_PARAMS.sort);
  if (sort && isSort(sort)) query.sort = sort;

  const page = Number(params.get(RESOURCE_QUERY_PARAMS.page));
  if (Number.isFinite(page) && page > 1) query.page = Math.trunc(page);

  return query;
}

/**
 * Serialises a query back into a search string, including the leading `?`.
 *
 * Default values are omitted so the canonical library URL stays `/resources`
 * rather than accumulating `?sort=newest&page=1`.
 */
export function buildResourceSearch(query: ResourceQuery): string {
  const params = new URLSearchParams();

  const term = query.q?.trim();
  if (term) params.set(RESOURCE_QUERY_PARAMS.search, term);
  if (query.category) params.set(RESOURCE_QUERY_PARAMS.category, query.category);
  if (query.sort && query.sort !== DEFAULT_RESOURCE_SORT) {
    params.set(RESOURCE_QUERY_PARAMS.sort, query.sort);
  }
  if (query.page !== undefined && query.page > 1) {
    params.set(RESOURCE_QUERY_PARAMS.page, String(query.page));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

/** Full href for a query, used by the pagination links. */
export function buildResourceHref(query: ResourceQuery): string {
  return `${RESOURCES_PATH}${buildResourceSearch(query)}`;
}

/**
 * Applies a change to the current query.
 *
 * Any change other than the page itself returns to page 1. Without this, a
 * reader on page 3 who narrows the search lands on page 3 of a shorter result
 * set, which is usually empty and reads as "no results" for a search that
 * actually matched.
 */
export function applyQueryPatch(
  current: ResourceQuery,
  patch: Partial<ResourceQuery>,
): ResourceQuery {
  const changesFilters = Object.keys(patch).some((field) => field !== 'page');
  const next: ResourceQuery = { ...current, ...patch };

  if (changesFilters) delete next.page;

  // Undefined entries would otherwise serialise as empty parameters.
  if (!next.q) delete next.q;
  if (!next.category) delete next.category;
  if (!next.sort) delete next.sort;

  return next;
}

/** True when no filter, search or page is applied. */
export function isDefaultQuery(query: ResourceQuery): boolean {
  return buildResourceSearch(query) === '';
}
