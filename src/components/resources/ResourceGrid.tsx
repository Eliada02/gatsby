import { cx } from '@/lib/cx';
import type { Resource } from '@/types/content';
import { ResourceCard } from './ResourceCard';
import * as styles from './ResourceGrid.module.css';

interface ResourceGridProps {
  resources: readonly Resource[];
  /** Dims the grid while a newer request is in flight. */
  isRefreshing?: boolean;
}

/**
 * The results list.
 *
 * A real list, so a screen reader announces how many results there are before
 * the reader commits to stepping through them. A grid of bare divs would give
 * no such count.
 */
export function ResourceGrid({ resources, isRefreshing }: ResourceGridProps) {
  return (
    <ul className={cx(styles.grid, isRefreshing && styles.refreshing)}>
      {resources.map((resource, index) => (
        <li key={resource.id}>
          {/* 1-based position within the page of results, recorded on open. */}
          <ResourceCard resource={resource} position={index + 1} />
        </li>
      ))}
    </ul>
  );
}
