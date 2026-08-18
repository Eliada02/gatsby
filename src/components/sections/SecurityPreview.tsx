import { SectionHeader } from '@/components/patterns/SectionHeader';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import type { SectionIntro, SecurityPractice } from '@/types/site';
import * as styles from './SecurityPreview.module.css';

interface SecurityPreviewProps {
  intro: SectionIntro;
  practices: readonly SecurityPractice[];
}

const HEADING_ID = 'security-heading';

/**
 * Security practices.
 *
 * The reference showed four badges reading "HIPAA Compliant", "SOC 2 Type II",
 * "FHIR R4 Ready" and "AES-256 Bit / Zero-Knowledge Vaults". Three of those are
 * claims of audited or certified status, which a fictional company cannot hold.
 * They are replaced by descriptions of architectural approach, and a content
 * test rejects any future edit that reintroduces certification language.
 */
export function SecurityPreview({ intro, practices }: SecurityPreviewProps) {
  return (
    <Section tone="subtle" border="top" aria-labelledby={HEADING_ID}>
      <Container>
        <SectionHeader
          headingId={HEADING_ID}
          eyebrow={intro.eyebrow}
          heading={intro.heading}
          summary={intro.summary}
        />

        <ul className={styles.list}>
          {practices.map((practice) => (
            <li key={practice.id} className={styles.card}>
              <h3 className={styles.title}>{practice.title}</h3>
              <p className={styles.description}>{practice.description}</p>
            </li>
          ))}
        </ul>

        <p className={styles.footnote}>
          These describe design intent for a demonstration project. NovaHealth holds no
          certifications and processes no real patient data.
        </p>
      </Container>
    </Section>
  );
}
