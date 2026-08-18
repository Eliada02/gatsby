import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Section.module.css';

export type SectionTone = 'canvas' | 'surface' | 'subtle' | 'dark' | 'darker';

interface SectionProps {
  children: ReactNode;
  tone?: SectionTone;
  spacing?: 'default' | 'large' | 'none';
  border?: 'none' | 'top' | 'bottom';
  id?: string;
  /**
   * Id of the heading that names this section.
   *
   * A bare <section> is not exposed as a landmark; it only becomes a navigable
   * `region` once it has an accessible name. Passing this is what makes the
   * section reachable via a screen reader's landmark list, so it is strongly
   * preferred over omitting it.
   */
  'aria-labelledby'?: string;
  className?: string;
}

const SPACING_CLASS = {
  default: undefined,
  large: styles.spacingLarge,
  none: styles.spacingNone,
} as const;

const BORDER_CLASS = {
  none: undefined,
  top: styles.borderTop,
  bottom: styles.borderBottom,
} as const;

const DARK_TONES: ReadonlySet<SectionTone> = new Set<SectionTone>(['dark', 'darker']);

/**
 * A page band: vertical rhythm plus a surface tone.
 *
 * Dark tones additionally carry the global `nh-on-dark` class, which switches
 * the focus ring to a light colour. Without it the sky-600 ring sits at roughly
 * 1.2:1 against a navy background and is effectively invisible to keyboard
 * users — the kind of regression that only appears when a section changes tone.
 */
export function Section({
  children,
  tone = 'canvas',
  spacing = 'default',
  border = 'none',
  id,
  'aria-labelledby': ariaLabelledBy,
  className,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cx(
        styles.section,
        styles[tone],
        SPACING_CLASS[spacing],
        BORDER_CLASS[border],
        DARK_TONES.has(tone) && 'nh-on-dark',
        className,
      )}
    >
      {children}
    </section>
  );
}
