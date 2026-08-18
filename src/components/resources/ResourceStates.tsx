import { Button, ButtonLink } from '@/components/primitives/Button';
import { describeApiError } from '@/lib/api/errors';
import type { ApiError } from '@/lib/api/errors';
import { RESOURCES_PATH } from '@/lib/resources/query-params';
import * as styles from './ResourceStates.module.css';

/**
 * Placeholder grid shown while the first page loads.
 *
 * Sized to match a real card so the layout does not shift when results arrive.
 * Entirely aria-hidden: reading out a dozen empty placeholders would tell a
 * screen reader user nothing. The loading announcement is made by the library's
 * single live region, so there is never a second one competing with it.
 */
export function ResourceLoading({ cards = 6 }: { cards?: number }) {
  return (
    <ul className={styles.skeletonGrid} aria-hidden="true">
      {Array.from({ length: cards }, (_unused, index) => (
        <li key={index} className={styles.skeletonCard}>
          <span className={styles.skeletonBadge} />
          <span className={styles.skeletonTitle} />
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLineShort} />
          <span className={styles.skeletonFooter} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Failure state.
 *
 * The message comes from describeApiError, which never includes status codes or
 * URLs. Retry is offered only when trying again could plausibly work: repeating
 * a request the server rejected as invalid just fails again.
 */
export function ResourceError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className={styles.state} role="alert">
      <h3 className={styles.stateHeading}>We could not load the resources</h3>
      <p className={styles.stateBody}>{describeApiError(error)}</p>

      {error.isRetryable ? (
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      ) : (
        <ButtonLink to={RESOURCES_PATH} variant="secondary">
          Return to all resources
        </ButtonLink>
      )}
    </div>
  );
}

interface ResourceEmptyProps {
  /** Present when the emptiness is caused by a search or filter. */
  searchTerm?: string;
  hasFilters: boolean;
  onReset: () => void;
}

/**
 * Empty state.
 *
 * Distinguishes "nothing matched your search" from "the library is empty",
 * because the two need different actions: one is fixed by clearing filters, the
 * other cannot be fixed by the reader at all.
 */
export function ResourceEmpty({ searchTerm, hasFilters, onReset }: ResourceEmptyProps) {
  if (!hasFilters) {
    return (
      <div className={styles.state}>
        <h3 className={styles.stateHeading}>No resources published yet</h3>
        <p className={styles.stateBody}>
          The library is being prepared. Please check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.state}>
      <h3 className={styles.stateHeading}>
        {searchTerm ? `No resources match “${searchTerm}”` : 'No resources in this category'}
      </h3>
      <p className={styles.stateBody}>
        Try a broader search term, or clear the filters to see the whole library.
      </p>
      <Button variant="primary" onClick={onReset}>
        Clear search and filters
      </Button>
    </div>
  );
}
