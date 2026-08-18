import { useEffect, useId, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import * as styles from './ResourceControls.module.css';

const SEARCH_DEBOUNCE_MS = 300;

interface ResourceSearchProps {
  /** Current term from the URL, which is the source of truth. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Search field for the resource library.
 *
 * The input holds local state because the URL cannot be rewritten on every
 * keystroke: that would push a history entry per character and make the back
 * button useless. Typing updates the field immediately, and the URL follows
 * once typing pauses.
 *
 * That leaves two copies of one value, which is exactly the divergence the
 * URL-as-source-of-truth rule exists to prevent, so the reconciliation is
 * explicit. `lastPushed` records the term this component last sent upward. A
 * change from the URL that does not match it came from somewhere else — the
 * back button, or the empty state's reset link — and is adopted.
 */
export function ResourceSearch({ value, onChange }: ResourceSearchProps) {
  const inputId = useId();
  const [term, setTerm] = useState(value);
  const lastPushed = useRef(value);
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);

  // Local typing, once settled, becomes the URL.
  useEffect(() => {
    if (debouncedTerm === lastPushed.current) return;
    lastPushed.current = debouncedTerm;
    onChange(debouncedTerm);
  }, [debouncedTerm, onChange]);

  // External URL changes become the field.
  useEffect(() => {
    if (value === lastPushed.current) return;
    lastPushed.current = value;
    setTerm(value);
  }, [value]);

  const clear = () => {
    setTerm('');
    lastPushed.current = '';
    onChange('');
  };

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        Search resources
      </label>

      <div className={styles.searchWrapper}>
        <input
          id={inputId}
          className={styles.searchInput}
          type="search"
          value={term}
          placeholder="Search by title, summary or tag"
          // The placeholder is supporting detail only; the label above is what
          // names the field, and it stays visible once text is entered.
          onChange={(event) => setTerm(event.target.value)}
        />

        {term !== '' && (
          <button type="button" className={styles.clearButton} onClick={clear}>
            {/* The visible glyph is decorative; the accessible name is the text. */}
            <span aria-hidden="true">&times;</span>
            <span className="nh-visually-hidden">Clear search</span>
          </button>
        )}
      </div>
    </div>
  );
}
