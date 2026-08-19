import type { ContentPoint } from '@/types/site';
import * as styles from './PointsList.module.css';

interface PointsListProps {
  points: readonly ContentPoint[];
  /**
   * Level of each point's heading. h3 under a band's h2 is the usual case; the
   * level is a prop so a nested use cannot skip a level in the outline.
   */
  headingLevel?: 'h3' | 'h4';
}

/**
 * A grid of short titled points.
 *
 * A real list, so a screen reader announces how many points there are before
 * the reader steps through them, and each title is a heading so the band can be
 * navigated by heading rather than read linearly.
 */
export function PointsList({ points, headingLevel: Heading = 'h3' }: PointsListProps) {
  return (
    <ul className={styles.list}>
      {points.map((point) => (
        <li key={point.id} className={styles.card}>
          <Heading className={styles.title}>{point.title}</Heading>
          <p className={styles.description}>{point.description}</p>
        </li>
      ))}
    </ul>
  );
}
