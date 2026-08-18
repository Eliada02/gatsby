import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import * as styles from './Badge.module.css';

interface BadgeProps {
  children: ReactNode;
  tone?: 'accent' | 'success' | 'inverse';
  /** Leading dot from the design reference. Decorative, so hidden from AT. */
  withDot?: boolean;
  className?: string;
}

/**
 * Small pill label. Always plain text: the reference animated a pulsing dot
 * inside it, which is decoration and is dropped here rather than animated,
 * since it conveys nothing and competes with the heading for attention.
 */
export function Badge({ children, tone = 'accent', withDot, className }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)}>
      {withDot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
