import { useId } from 'react';
import type { ResourceSort } from '@/types/api';
import { RESOURCE_SORTS } from '@/types/api';
import type { ResourceCategory } from '@/types/content';
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS } from '@/types/content';
import * as styles from './ResourceControls.module.css';

interface ResourceFiltersProps {
  category: ResourceCategory | undefined;
  sort: ResourceSort;
  onCategoryChange: (category: ResourceCategory | undefined) => void;
  onSortChange: (sort: ResourceSort) => void;
}

const SORT_LABELS: Record<ResourceSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A to Z',
};

/**
 * Category and sort controls.
 *
 * Native selects rather than custom dropdowns. A custom listbox means
 * reimplementing arrow keys, type-ahead, Escape, focus return and the mobile
 * picker, and getting any of it wrong makes the filter unusable by keyboard.
 * The native control also gives platform-appropriate behaviour on touch devices
 * for free.
 *
 * Both options lists are generated from the same const arrays the types are
 * derived from, so an option can never reference a category the API would
 * reject.
 */
export function ResourceFilters({
  category,
  sort,
  onCategoryChange,
  onSortChange,
}: ResourceFiltersProps) {
  const categoryId = useId();
  const sortId = useId();

  return (
    <>
      <div className={styles.field}>
        <label htmlFor={categoryId} className={styles.label}>
          Category
        </label>
        <select
          id={categoryId}
          className={styles.select}
          value={category ?? ''}
          onChange={(event) =>
            onCategoryChange((event.target.value || undefined) as ResourceCategory | undefined)
          }
        >
          <option value="">All resources</option>
          {RESOURCE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {RESOURCE_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={sortId} className={styles.label}>
          Sort by
        </label>
        <select
          id={sortId}
          className={styles.select}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ResourceSort)}
        >
          {RESOURCE_SORTS.map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
