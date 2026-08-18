import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { flushPending } from '@/lib/analytics/dataLayer';
import type { ConsentState } from '@/lib/analytics/consent';
import { readConsent, setConsent, subscribeToConsent } from '@/lib/analytics/consent';
import * as styles from './ConsentBanner.module.css';

/**
 * Asks before anything is measured.
 *
 * Not a modal. A consent notice that traps focus and blocks the page is a dark
 * pattern in everything but name: it makes declining harder than accepting.
 * This is a region the reader can ignore, and both choices are equally
 * reachable and equally prominent.
 *
 * It renders nothing until mounted. Consent lives in localStorage, which does
 * not exist during server rendering, so deciding on the server would either
 * bake "unset" into the static HTML — showing the banner to someone who already
 * answered — or produce a hydration mismatch.
 *
 * A production site would use a consent management platform with per-purpose
 * categories and an audit trail. This is the smallest correct version: a
 * default of no, a remembered choice, and one gate that every event passes
 * through.
 */
export function ConsentBanner() {
  const [state, setState] = useState<ConsentState | null>(null);

  useEffect(() => {
    setState(readConsent());
    // Keeps tabs in step: a choice made in one applies in the others.
    return subscribeToConsent(() => setState(readConsent()));
  }, []);

  if (state !== 'unset') return null;

  const choose = (granted: boolean) => {
    setConsent(granted ? 'granted' : 'denied');
    setState(granted ? 'granted' : 'denied');
    // Sends the page view captured before the choice, so accepting does not
    // lose the visit it was made during.
    if (granted) flushPending();
  };

  return (
    <section className={styles.banner} aria-label="Analytics consent">
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={styles.title}>Help us understand how this site is used</p>
          <p className={styles.body}>
            We would like to record anonymous usage events to see which resources people find
            useful. Nothing is measured unless you agree, and no health information is ever
            collected. NovaHealth is a fictional demonstration project.
          </p>
        </div>

        <div className={styles.actions}>
          {/*
           * Decline is listed first and styled with equal weight. Burying the
           * refusal is the most common accessibility and consent failure in
           * banners of this kind.
           */}
          <Button variant="secondary" size="sm" onClick={() => choose(false)}>
            Decline
          </Button>
          <Button variant="primary" size="sm" onClick={() => choose(true)}>
            Accept analytics
          </Button>
        </div>
      </div>
    </section>
  );
}
