/**
 * Analytics consent.
 *
 * This is a health site aimed at a European audience, so analytics cannot fire
 * before the visitor agrees to it. That is not a nicety: a German court has
 * already ruled on transmitting IP addresses to a third party without consent,
 * and health context raises the stakes further.
 *
 * The gate lives in the analytics facade rather than in each call site, so no
 * component has to remember it. Consent defaults to **denied**: an opt-out
 * default would make the gate decorative.
 *
 * This is not a consent management platform. A production site would use one,
 * with per-purpose categories and a documented audit trail. What is here is the
 * smallest correct version: a stored choice, a default of no, and a single
 * function every event passes through.
 */

const STORAGE_KEY = 'nh-analytics-consent';

export type ConsentState = 'granted' | 'denied' | 'unset';

/** Notifies the banner when the choice changes within the same document. */
const CONSENT_EVENT = 'nh:consent-change';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function readConsent(): ConsentState {
  if (!isBrowser()) return 'unset';

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'granted' || stored === 'denied') return stored;
  } catch {
    // localStorage throws in private browsing modes and when storage is
    // disabled. Treating that as "no choice recorded" is the safe reading.
  }
  return 'unset';
}

export function setConsent(state: Exclude<ConsentState, 'unset'>): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Unable to persist. The choice still applies for this page view via the
    // event below, it simply will not be remembered.
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

/** The single check every analytics event passes through. */
export function hasAnalyticsConsent(): boolean {
  return readConsent() === 'granted';
}

export function subscribeToConsent(listener: () => void): () => void {
  if (!isBrowser()) return () => {};

  window.addEventListener(CONSENT_EVENT, listener);
  // Storage events fire when another tab changes the value, so a choice made
  // in one tab applies in the others.
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(CONSENT_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
