import { cx } from '@/lib/cx';
import { Badge } from './Badge';
import * as styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  /** Must match the Section's aria-labelledby so the band becomes a named region. */
  headingId: string;
  eyebrow?: string;
  heading: string;
  summary?: string;
  align?: 'start' | 'center';
  tone?: 'default' | 'inverse';
}

/**
 * Eyebrow, heading and summary for a page band.
 *
 * The eyebrow is a Badge rather than a heading. It reads as a label, and
 * marking it up as a heading would introduce an extra level that breaks the
 * document outline for anyone navigating by headings.
 */
export function SectionHeader({
  headingId,
  eyebrow,
  heading,
  summary,
  align = 'center',
  tone = 'default',
}: SectionHeaderProps) {
  return (
    <div className={cx(styles.header, align === 'center' && styles.center)}>
      {eyebrow && <Badge tone={tone === 'inverse' ? 'inverse' : 'accent'}>{eyebrow}</Badge>}

      <h2 id={headingId} className={styles.heading}>
        {heading}
      </h2>

      {summary && (
        <p className={cx(styles.summary, tone === 'inverse' && styles.summaryInverse)}>{summary}</p>
      )}
    </div>
  );
}
