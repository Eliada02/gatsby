import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import type { FinalCtaContent } from '@/types/site';
import * as styles from './FinalCta.module.css';

const HEADING_ID = 'final-cta-heading';

/**
 * Closing call to action.
 *
 * Both actions navigate, so both are links rather than buttons. The reference
 * used <button onclick> for what were navigations, which announces them as
 * buttons and breaks middle-click, right-click and open-in-new-tab.
 *
 * nh-on-dark is applied to the banner rather than the Section, because the
 * band around it is the light canvas and only the banner is dark.
 */
export function FinalCta({ content }: { content: FinalCtaContent }) {
  return (
    <Section tone="canvas" aria-labelledby={HEADING_ID}>
      <Container>
        <div className={`${styles.banner} nh-on-dark`}>
          <h2 id={HEADING_ID} className={styles.heading}>
            {content.heading}
          </h2>
          <p className={styles.summary}>{content.summary}</p>

          <div className={styles.actions}>
            <ButtonLink
              to={content.primaryCta.to}
              variant="inverse"
              size="lg"
              shape="pill"
              withArrow
            >
              {content.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              to={content.secondaryCta.to}
              variant="inverseOutline"
              size="lg"
              shape="pill"
            >
              {content.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
