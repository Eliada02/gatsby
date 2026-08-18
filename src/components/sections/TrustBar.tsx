import { SectionHeader } from '@/components/patterns/SectionHeader';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import type { TrustContent } from '@/types/site';
import * as styles from './TrustBar.module.css';

const HEADING_ID = 'trust-heading';

/**
 * Credibility band.
 *
 * The design reference listed Stanford Medicine, Mount Sinai, Cleveland and
 * Mayo under "Trusted by leading healthcare networks", which asserts customer
 * relationships that do not exist. These organisations are invented, the
 * heading makes no claim of use, and the disclaimer states both facts plainly.
 */
export function TrustBar({ content }: { content: TrustContent }) {
  return (
    <Section tone="surface" border="top" aria-labelledby={HEADING_ID}>
      <Container>
        <SectionHeader
          headingId={HEADING_ID}
          eyebrow={content.eyebrow}
          heading={content.heading}
          summary={content.summary}
        />

        <ul className={styles.list}>
          {content.organisations.map((organisation) => (
            <li key={organisation.id} className={styles.organisation}>
              {organisation.name}
            </li>
          ))}
        </ul>

        <p className={styles.disclaimer}>{content.disclaimer}</p>
      </Container>
    </Section>
  );
}
