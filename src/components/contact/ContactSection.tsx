import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import type { ContactIntro } from '@/types/site';
import { ContactForm } from './ContactForm';
import * as styles from './ContactSection.module.css';

const HEADING_ID = 'contact-heading';

/** The anchor every "Contact us" call to action on the site points at. */
export const CONTACT_ANCHOR = 'contact';

/**
 * The contact band.
 *
 * Carries `id="contact"` because the header, the footer, the impact model and
 * the closing call to action all link to /about#contact. The id lives on the
 * section rather than on the form, so following one of those links puts the
 * heading and the note at the top of the viewport instead of dropping the
 * reader into a field with no context.
 */
export function ContactSection({ content }: { content: ContactIntro }) {
  return (
    <Section id={CONTACT_ANCHOR} tone="surface" border="top" aria-labelledby={HEADING_ID}>
      <Container size="narrow">
        <div className={styles.intro}>
          <h2 id={HEADING_ID}>{content.heading}</h2>
          <p className={styles.summary}>{content.summary}</p>
          <p className={styles.note}>{content.note}</p>
        </div>

        <ContactForm />
      </Container>
    </Section>
  );
}
