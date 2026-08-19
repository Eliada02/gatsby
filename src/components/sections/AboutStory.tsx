import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import type { AboutStory as AboutStoryContent } from '@/types/site';
import * as styles from './AboutStory.module.css';

const HEADING_ID = 'about-story-heading';

/**
 * The company narrative.
 *
 * Constrained to the prose measure: long-form copy set across the full
 * container is measurably harder to read, and the narrow container exists for
 * exactly this.
 */
export function AboutStory({ content }: { content: AboutStoryContent }) {
  return (
    <Section tone="surface" border="top" aria-labelledby={HEADING_ID}>
      <Container size="narrow">
        <h2 id={HEADING_ID}>{content.heading}</h2>

        <div className={styles.paragraphs}>
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </Container>
    </Section>
  );
}
