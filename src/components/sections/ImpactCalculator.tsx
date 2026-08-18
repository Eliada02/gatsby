import { useId, useState } from 'react';
import { SectionHeader } from '@/components/patterns/SectionHeader';
import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  CLINICIAN_RANGE,
  ILLUSTRATIVE_ASSUMPTIONS,
  calculateImpact,
  formatNumber,
} from '@/lib/impact';
import type { ImpactContent } from '@/types/site';
import * as styles from './ImpactCalculator.module.css';

const HEADING_ID = 'impact-heading';
const ANNOUNCE_DELAY_MS = 500;

/**
 * Interactive illustrative model.
 *
 * Built on a native <input type="range"> rather than a custom slider. Custom
 * sliders are among the most frequently broken widgets on the web: rebuilding
 * one means reimplementing arrow keys, Home/End, Page Up/Down, touch dragging,
 * the value announcement and the disabled state, and getting any of them wrong
 * removes the control from keyboard users entirely. The native element provides
 * all of it, and CSS can style it adequately.
 *
 * All arithmetic lives in lib/impact.ts. This component reads a number and
 * renders the result.
 */
export function ImpactCalculator({ content }: { content: ImpactContent }) {
  const [clinicians, setClinicians] = useState<number>(CLINICIAN_RANGE.initial);

  // useId keeps label/input association correct if the section is ever used
  // twice on one page, where a hard-coded id would silently break the second.
  const sliderId = useId();
  const assumptionsId = useId();

  const result = calculateImpact(clinicians);

  /*
   * The visible figures follow the slider immediately; the spoken summary waits
   * until the user stops moving it. Announcing every step of a drag would emit
   * dozens of interruptions.
   */
  const announcedClinicians = useDebouncedValue(clinicians, ANNOUNCE_DELAY_MS);
  const announced = calculateImpact(announcedClinicians);

  return (
    <Section tone="surface" aria-labelledby={HEADING_ID}>
      <Container>
        <SectionHeader
          headingId={HEADING_ID}
          eyebrow={content.eyebrow}
          heading={content.heading}
          summary={content.summary}
        />

        <div className={`${styles.panel} nh-on-dark`}>
          <div className={styles.controls}>
            <label htmlFor={sliderId} className={styles.label}>
              {content.sliderLabel}
              {/*
               * A span rather than <output>. <output> has an implicit
               * role="status", which makes it a live region: it would announce
               * on every step of a drag, duplicating the value the slider
               * already reports and defeating the debounced summary below.
               */}
              <span className={styles.value}>{result.clinicians}</span>
            </label>

            <input
              id={sliderId}
              className={styles.slider}
              type="range"
              min={CLINICIAN_RANGE.min}
              max={CLINICIAN_RANGE.max}
              step={CLINICIAN_RANGE.step}
              value={clinicians}
              // aria-valuetext gives the number a unit. Without it a screen
              // reader announces a bare "40", which is ambiguous.
              aria-valuetext={`${result.clinicians} clinicians`}
              aria-describedby={assumptionsId}
              onChange={(event) => setClinicians(event.target.valueAsNumber)}
            />

            <p id={assumptionsId} className={styles.assumptions}>
              Model assumptions: {ILLUSTRATIVE_ASSUMPTIONS.hoursPerClinicianPerWeek} hours returned
              per clinician each week, {ILLUSTRATIVE_ASSUMPTIONS.appointmentsPerClinicianPerYear}{' '}
              appointments recovered per clinician each year, over{' '}
              {ILLUSTRATIVE_ASSUMPTIONS.clinicalWeeksPerYear} clinical weeks.
            </p>
          </div>

          <div className={styles.results}>
            <h3 className={styles.resultsHeading}>{content.resultsLabel}</h3>

            <dl className={styles.figures}>
              <div className={styles.figure}>
                <dt className={styles.figureLabel}>Hours returned each week</dt>
                <dd className={styles.figureValue}>{formatNumber(result.hoursPerWeek)}</dd>
              </div>
              <div className={styles.figure}>
                <dt className={styles.figureLabel}>Hours returned each year</dt>
                <dd className={styles.figureValue}>{formatNumber(result.hoursPerYear)}</dd>
              </div>
              <div className={styles.figureWide}>
                <dt className={styles.figureLabel}>Appointments recovered each year</dt>
                <dd className={styles.figureValue}>{formatNumber(result.appointmentsPerYear)}</dd>
              </div>
            </dl>

            {/*
             * Debounced spoken summary. aria-atomic makes the whole sentence
             * read as one unit rather than only the changed fragment.
             */}
            <p className="nh-visually-hidden" role="status" aria-atomic="true">
              {`For ${announced.clinicians} clinicians the illustrative model projects ${formatNumber(announced.hoursPerWeek)} hours returned each week, ${formatNumber(announced.hoursPerYear)} hours each year, and ${formatNumber(announced.appointmentsPerYear)} appointments recovered each year.`}
            </p>

            <p className={styles.disclaimer}>{content.disclaimer}</p>

            <ButtonLink to={content.cta.to} variant="inverse" size="md" fullWidth withArrow>
              {content.cta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
