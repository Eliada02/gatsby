import { MAIN_CONTENT_ID } from './constants';
import * as styles from './SkipLink.module.css';

/**
 * First focusable element on every page.
 *
 * Lets keyboard and screen reader users jump past the header and navigation
 * rather than tabbing through them on every page. It is invisible until it
 * receives focus, so it costs nothing visually.
 */
export function SkipLink() {
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
      Skip to main content
    </a>
  );
}
