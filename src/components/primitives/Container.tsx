import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Container.module.css';

interface ContainerProps {
  children: ReactNode;
  /** `narrow` constrains to a prose measure for long-form copy. */
  size?: 'default' | 'narrow';
  className?: string;
}

/**
 * Constrains content width and applies the page gutter.
 *
 * Deliberately renders a plain div and adds no semantics: landmark roles come
 * from Section, header, footer and nav. A layout wrapper that also claimed a
 * role would produce nested landmarks that screen reader users have to navigate
 * past.
 */
export function Container({ children, size = 'default', className }: ContainerProps) {
  return <div className={cx(styles.container, styles[size], className)}>{children}</div>;
}
