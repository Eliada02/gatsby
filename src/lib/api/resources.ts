import type { ResourceListResponse, ResourceQuery } from '@/types/api';
import { requestJson } from './client';

/**
 * Typed access to the resources endpoint.
 *
 * The only module that knows the endpoint's URL shape. Components call
 * getResources(query) and never assemble a query string, so the parameter names
 * live in exactly two places: here and the handler that reads them.
 */

/**
 * Builds the request path.
 *
 * Exported because the hook uses it as a cache key: two queries that produce
 * the same path are the same request, which is a more reliable identity than
 * comparing objects field by field.
 *
 * Empty and default values are omitted so equivalent queries share one key.
 */
export function buildResourcesPath(query: ResourceQuery): string {
  const params = new URLSearchParams();

  const q = query.q?.trim();
  if (q) params.set('q', q);
  if (query.category) params.set('category', query.category);
  if (query.sort) params.set('sort', query.sort);
  if (query.page !== undefined && query.page > 1) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));

  // Sorted so parameter order never changes the key for the same query.
  params.sort();

  const search = params.toString();
  return search ? `/api/resources?${search}` : '/api/resources';
}

export function getResources(
  query: ResourceQuery,
  options: { signal?: AbortSignal } = {},
): Promise<ResourceListResponse> {
  return getResourcesByPath(buildResourcesPath(query), options);
}

/**
 * Fetches a path produced by buildResourcesPath.
 *
 * Exists so the loading hook can depend on the serialised path alone. Without
 * it the hook would have to depend on the query object, which is new on every
 * render, and the effect would need its dependencies suppressed.
 */
export function getResourcesByPath(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<ResourceListResponse> {
  return requestJson<ResourceListResponse>(path, options);
}
