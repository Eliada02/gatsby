import { Link } from 'gatsby';
import * as styles from './Logo.module.css';

interface LogoProps {
  /** Light mark for use on the navy footer. */
  tone?: 'default' | 'inverse';
}

/**
 * Wordmark and mark, linking home.
 *
 * The SVG is aria-hidden and the accessible name comes from the visible text.
 * A decorative mark with its own alt text would make screen readers announce
 * the brand twice.
 */
export function Logo({ tone = 'default' }: LogoProps) {
  return (
    <Link to="/" className={tone === 'inverse' ? styles.linkInverse : styles.link}>
      <span className={styles.mark} aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          focusable="false"
        >
          <path d="M12 3V21M3 12H21" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="var(--nh-emerald-500)" stroke="none" />
        </svg>
      </span>

      <span className={styles.text}>
        <span className={styles.wordmark}>
          NovaHealth
          <span className={styles.dot} aria-hidden="true" />
        </span>
        <span className={styles.tagline}>Digital Patient Experience</span>
      </span>
    </Link>
  );
}
