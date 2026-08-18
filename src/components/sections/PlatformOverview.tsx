import { SectionHeader } from '@/components/patterns/SectionHeader';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { cx } from '@/lib/cx';
import type { PlatformCapability, SectionIntro } from '@/types/site';
import * as styles from './PlatformOverview.module.css';

interface PlatformOverviewProps {
  intro: SectionIntro;
  capabilities: readonly PlatformCapability[];
}

const HEADING_ID = 'platform-heading';

const ACCENT_CLASS: Record<PlatformCapability['accent'], string | undefined> = {
  sky: styles.sky,
  emerald: styles.emerald,
  teal: styles.teal,
};

/**
 * Dark platform band.
 *
 * Section tone="dark" carries the nh-on-dark class, which switches the focus
 * ring to a light colour. Any link added inside this band inherits that without
 * the author having to remember it.
 */
export function PlatformOverview({ intro, capabilities }: PlatformOverviewProps) {
  return (
    <Section tone="dark" aria-labelledby={HEADING_ID}>
      <Container>
        <SectionHeader
          headingId={HEADING_ID}
          eyebrow={intro.eyebrow}
          heading={intro.heading}
          summary={intro.summary}
          tone="inverse"
        />

        <div className={styles.panel}>
          <ul className={styles.list}>
            {capabilities.map((capability) => (
              <li key={capability.id} className={styles.card}>
                <h3 className={styles.title}>{capability.title}</h3>
                <p className={styles.description}>{capability.description}</p>
                <p className={cx(styles.note, ACCENT_CLASS[capability.accent])}>
                  <span className={styles.noteDot} aria-hidden="true" />
                  {capability.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
