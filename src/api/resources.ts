import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from 'gatsby';
import { queryResources } from '../lib/content/resource-query';
import { resources } from '../lib/content/source';
import type { ApiErrorBody, ResourceListResponse, ResourceQuery } from '../types/api';
import { RESOURCE_SORTS } from '../types/api';
import { RESOURCE_CATEGORIES } from '../types/content';
import type { ResourceCategory } from '../types/content';
import type { ResourceSort } from '../types/api';

/**
 * GET /api/resources
 *
 * A real HTTP endpoint rather than a client-side mock. Filtering, sorting and
 * pagination happen here, so the browser receives one page rather than the
 * whole library and then hides most of it.
 *
 * Imports are relative rather than using the `@/` alias: Gatsby compiles
 * functions through a separate pipeline from the site bundle, and the alias
 * configured in gatsby-node.ts is not guaranteed to apply there.
 */

/** Query parameter names. Shared with the client through this one comment and
 * the parsing below; the client builds them in lib/api/resources.ts. */
const PARAMS = {
  q: 'q',
  category: 'category',
  sort: 'sort',
  page: 'page',
  pageSize: 'pageSize',
} as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  // Express-style parsers hand back an array when a parameter repeats.
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isCategory(value: string): value is ResourceCategory {
  return (RESOURCE_CATEGORIES as readonly string[]).includes(value);
}

function isSort(value: string): value is ResourceSort {
  return (RESOURCE_SORTS as readonly string[]).includes(value);
}

function badRequest(res: GatsbyFunctionResponse<ApiErrorBody>, code: string, message: string) {
  res.status(400).json({ code, message });
}

export default function handler(
  req: GatsbyFunctionRequest,
  res: GatsbyFunctionResponse<ResourceListResponse | ApiErrorBody>,
): void {
  if (req.method !== 'GET') {
    res.status(405).json({ code: 'method_not_allowed', message: 'Only GET is supported.' });
    return;
  }

  const params = req.query as Record<string, string | string[] | undefined>;

  /*
   * Development affordance: lets the error state be exercised in a browser
   * without breaking the network. Guarded behind an explicit parameter, so it
   * cannot be triggered by ordinary use.
   */
  if (firstValue(params.simulateError) === '1') {
    res.status(500).json({
      code: 'simulated_failure',
      message: 'Simulated failure for verifying the error state.',
    });
    return;
  }

  const query: ResourceQuery = {};

  const q = firstValue(params[PARAMS.q]);
  if (q !== undefined && q.trim() !== '') query.q = q;

  const category = firstValue(params[PARAMS.category]);
  if (category !== undefined && category !== '') {
    // Rejected rather than ignored. Silently dropping an unknown filter would
    // return results that contradict the URL the user is looking at.
    if (!isCategory(category)) {
      badRequest(res, 'invalid_category', `Unknown category "${category}".`);
      return;
    }
    query.category = category;
  }

  const sort = firstValue(params[PARAMS.sort]);
  if (sort !== undefined && sort !== '') {
    if (!isSort(sort)) {
      badRequest(res, 'invalid_sort', `Unknown sort "${sort}".`);
      return;
    }
    query.sort = sort;
  }

  const page = parsePositiveInt(firstValue(params[PARAMS.page]));
  if (page !== undefined) query.page = page;

  const pageSize = parsePositiveInt(firstValue(params[PARAMS.pageSize]));
  if (pageSize !== undefined) query.pageSize = pageSize;

  const result = queryResources(resources, query);

  // Short cache with revalidation: the content is static per build, but a long
  // max-age would keep a stale library alive after a redeploy.
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.status(200).json(result);
}
