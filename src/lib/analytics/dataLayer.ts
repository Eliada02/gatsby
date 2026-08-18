import type { AnalyticsEvent } from '@/types/analytics';
import { hasAnalyticsConsent } from './consent';

/**
 * The dataLayer facade.
 *
 * Every analytics event in the site goes through this one function. No
 * component touches `window.dataLayer` directly, so swapping Google Tag Manager
 * for Segment, Plausible or a first-party endpoint is a change to this file
 * rather than to every component that measures something.
 *
 * Responsibilities, in order:
 *   1. do nothing during server rendering
 *   2. drop the event if consent has not been granted
 *   3. initialise the array if the GTM snippet has not created it yet
 *   4. push
 *   5. log in development, so instrumentation is verifiable without GTM
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/** Events attempted before consent, so nothing is lost if consent is granted later. */
const pending: AnalyticsEvent[] = [];

const MAX_PENDING = 20;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Pushes onto window.dataLayer, creating it if necessary.
 *
 * The array must exist before the GTM container loads, or events fired during
 * page initialisation are lost. gatsby-ssr.tsx creates it in the document head
 * ahead of the container script; this guard covers the case where no container
 * is configured at all.
 */
function push(event: AnalyticsEvent): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);

  if (process.env.NODE_ENV === 'development') {
    // Deliberate: makes the tracking plan inspectable in the console without a
    // GTM container or a network tab full of collect requests.
    // eslint-disable-next-line no-console
    console.info('[analytics]', event.event, event);
  }
}

/**
 * Records an analytics event.
 *
 * The parameter type is the whole tracking plan, so an unknown event name or a
 * missing parameter is a compile error rather than a silent no-op in a report.
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!isBrowser()) return;

  if (!hasAnalyticsConsent()) {
    // Queued rather than discarded: someone who accepts after reading the
    // banner should still have their arrival counted. Bounded so a visitor who
    // never consents cannot grow the array indefinitely.
    if (pending.length < MAX_PENDING) pending.push(event);
    return;
  }

  flushPending();
  push(event);
}

/** Sends anything captured before consent was granted. */
export function flushPending(): void {
  if (!isBrowser() || !hasAnalyticsConsent()) return;

  while (pending.length > 0) {
    const event = pending.shift();
    if (event) push(event);
  }
}

/** Test seam: clears the queue between cases. */
export function resetPendingEvents(): void {
  pending.length = 0;
}
