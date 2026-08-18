import { Badge } from '@/components/patterns/Badge';
import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import type { HeroContent, PortalPreview as PortalPreviewContent } from '@/types/site';
import { PortalPreview } from './PortalPreview';
import * as styles from './Hero.module.css';

interface HeroProps {
  content: HeroContent;
  portal: PortalPreviewContent;
}

/**
 * Page hero.
 *
 * Renders the page's only <h1>, so it is a plain <section> rather than one
 * labelled as a region: the h1 already names the page, and a region wrapping it
 * would add a landmark with a duplicate name.
 *
 * The metrics are a description list. They are label/value pairs, and a <dl>
 * conveys that pairing to a screen reader where three stacked divs would read
 * as six unrelated fragments.
 */
export function Hero({ content, portal }: HeroProps) {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.content}>
            <Badge withDot>{content.eyebrow}</Badge>

            <h1 className={styles.heading}>
              {content.headingStart}
              <span className={styles.accent}>{content.headingAccent}</span>
            </h1>

            <p className={styles.summary}>{content.summary}</p>

            <div className={styles.actions}>
              <ButtonLink to={content.primaryCta.to} variant="primary" size="lg" withArrow>
                {content.primaryCta.label}
              </ButtonLink>
              <ButtonLink to={content.secondaryCta.to} variant="secondary" size="lg">
                {content.secondaryCta.label}
              </ButtonLink>
            </div>

            <dl className={styles.metrics}>
              {content.metrics.map((metric) => (
                <div key={metric.label} className={styles.metric}>
                  <dt className={styles.metricLabel}>{metric.label}</dt>
                  <dd className={styles.metricValue}>{metric.value}</dd>
                </div>
              ))}
            </dl>

            <p className={styles.metricsNote}>{content.metricsNote}</p>
          </div>

          <PortalPreview content={portal} />
        </div>
      </Container>
    </section>
  );
}
