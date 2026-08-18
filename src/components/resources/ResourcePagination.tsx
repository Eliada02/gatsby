import { ButtonLink } from '@/components/primitives/Button';
import { applyQueryPatch, buildResourceHref } from '@/lib/resources/query-params';
import type { PaginationMeta, ResourceQuery } from '@/types/api';
import * as styles from './ResourcePagination.module.css';

interface ResourcePaginationProps {
  meta: PaginationMeta;
  query: ResourceQuery;
}

/**
 * Previous and next controls for the library.
 *
 * These are links, not buttons. Each page has a real URL, so a link is the
 * honest element: it can be opened in a new tab, middle-clicked, copied and
 * bookmarked, and it is announced as navigation rather than as an action.
 * Gatsby's Link keeps the transition client-side.
 *
 * The unavailable direction is not rendered as a disabled link, because no such
 * thing exists — aria-disabled leaves an anchor focusable and followable.
 * Inert text takes its place instead.
 *
 * Page numbers come from the response rather than the URL, so a clamped
 * out-of-range page still produces coherent controls.
 */
export function ResourcePagination({ meta, query }: ResourcePaginationProps) {
  if (meta.totalPages <= 1) return null;

  const hasPrevious = meta.page > 1;
  const hasNext = meta.page < meta.totalPages;

  const hrefFor = (page: number) => buildResourceHref(applyQueryPatch(query, { page }));

  return (
    <nav className={styles.nav} aria-label="Resource library pages">
      <p className={styles.status}>
        Page <span className={styles.current}>{meta.page}</span> of {meta.totalPages}
        <span className="nh-visually-hidden">, {meta.total} resources in total</span>
      </p>

      <div className={styles.controls}>
        {hasPrevious ? (
          <ButtonLink to={hrefFor(meta.page - 1)} variant="secondary" size="md">
            {/* The visible label is short; the accessible name states which page. */}
            <span aria-hidden="true">&larr; Previous</span>
            <span className="nh-visually-hidden">Previous page, page {meta.page - 1}</span>
          </ButtonLink>
        ) : (
          <span className={styles.inactive} aria-hidden="true">
            &larr; Previous
          </span>
        )}

        {hasNext ? (
          <ButtonLink to={hrefFor(meta.page + 1)} variant="secondary" size="md">
            <span aria-hidden="true">Next &rarr;</span>
            <span className="nh-visually-hidden">Next page, page {meta.page + 1}</span>
          </ButtonLink>
        ) : (
          <span className={styles.inactive} aria-hidden="true">
            Next &rarr;
          </span>
        )}
      </div>
    </nav>
  );
}
