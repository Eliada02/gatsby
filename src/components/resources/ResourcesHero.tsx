import { Badge } from '@/components/patterns/Badge';
import { Container } from '@/components/primitives/Container';
import * as styles from './ResourcesHero.module.css';

/**
 * Page hero for the library. Holds the page's only h1, so it is a plain section
 * rather than a labelled region: the h1 already names the page.
 */
export function ResourcesHero() {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.inner}>
          <Badge withDot>Resource library</Badge>
          <h1 className={styles.heading}>Insights for a more connected healthcare experience</h1>
          <p className={styles.summary}>
            Practical writing on patient experience, interoperability, clinical operations and the
            security decisions that sit underneath them.
          </p>
        </div>
      </Container>
    </section>
  );
}
