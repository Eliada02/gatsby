import { Badge } from '@/components/patterns/Badge';
import { Container } from '@/components/primitives/Container';
import * as styles from './PageHero.module.css';

interface PageHeroProps {
  eyebrow: string;
  heading: string;
  summary: string;
}

/**
 * The opening band of a content page.
 *
 * Holds the page's only h1, so it is a plain <section> rather than a labelled
 * region: the h1 already names the page, and a region wrapping it would add a
 * landmark with a duplicate name.
 */
export function PageHero({ eyebrow, heading, summary }: PageHeroProps) {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.inner}>
          <Badge withDot>{eyebrow}</Badge>
          <h1 className={styles.heading}>{heading}</h1>
          <p className={styles.summary}>{summary}</p>
        </div>
      </Container>
    </section>
  );
}
