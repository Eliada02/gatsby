import type { ContactFieldErrors } from './contact';
import type { Resource, ResourceCategory } from './content';

/**
 * Contract shared by the REST layer (src/api) and its client (src/lib/api).
 * Defining it once means a change to the API shape breaks compilation on both
 * sides rather than only failing at runtime.
 */

/** Sort options exposed by the resource endpoint and the ?sort= query parameter. */
export const RESOURCE_SORTS = ['newest', 'oldest', 'title'] as const;

export type ResourceSort = (typeof RESOURCE_SORTS)[number];

/**
 * Query accepted by GET /api/resources. Every field is optional: an unfiltered
 * request is valid and returns the first page of everything.
 */
export interface ResourceQuery {
  /** Free-text search across title, summary and tags. */
  q?: string;
  category?: ResourceCategory;
  sort?: ResourceSort;
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Envelope for list endpoints. Pagination metadata has to travel with the data;
 * returning a bare array leaves the UI unable to render a pager without a
 * second request.
 */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type ResourceListResponse = Paginated<Resource>;

/** Error body returned by the API. `code` is for logic, `message` is for people. */
export interface ApiErrorBody {
  code: string;
  message: string;
}

/* ---- POST /api/contact ---- */

/**
 * Accepted submission.
 *
 * `status` rather than a bare 200 body, so the client can distinguish "the
 * server took this" from any proxy or gateway that happens to answer with JSON.
 */
export interface ContactSuccessBody {
  status: 'received';
  message: string;
}

/**
 * Rejected submission.
 *
 * `fields` carries one message per invalid field so the form can attach each
 * one to the input it belongs to, rather than showing a single sentence that
 * leaves the reader to guess which field is wrong.
 */
export interface ContactErrorBody extends ApiErrorBody {
  fields?: ContactFieldErrors;
}
