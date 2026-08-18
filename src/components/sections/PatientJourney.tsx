import { SectionHeader } from '@/components/patterns/SectionHeader';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import type { JourneyStage, SectionIntro } from '@/types/site';
import * as styles from './PatientJourney.module.css';

interface PatientJourneyProps {
  intro: SectionIntro;
  stages: readonly JourneyStage[];
}

const HEADING_ID = 'journey-heading';

/**
 * The five-stage care journey.
 *
 * Marked up as an ordered list because the stages are a sequence, not a set.
 * A screen reader then announces "list of 5 items" and the position within it,
 * which is exactly the information the visual numbering conveys.
 *
 * The visible "Stage 01" labels are aria-hidden: the list already communicates
 * position, so reading both would duplicate it on every item.
 */
export function PatientJourney({ intro, stages }: PatientJourneyProps) {
  return (
    <Section tone="surface" aria-labelledby={HEADING_ID}>
      <Container>
        <SectionHeader
          headingId={HEADING_ID}
          eyebrow={intro.eyebrow}
          heading={intro.heading}
          summary={intro.summary}
        />

        <ol className={styles.list}>
          {stages.map((stage) => (
            <li key={stage.id} className={styles.card}>
              <span className={styles.stage} aria-hidden="true">
                Stage {String(stage.order).padStart(2, '0')}
              </span>
              <h3 className={styles.title}>{stage.title}</h3>
              <p className={styles.description}>{stage.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
