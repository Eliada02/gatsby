import { ANALYTICS_EVENTS } from '@/types/analytics';
import { hasAnalyticsConsent, readConsent, setConsent } from './consent';
import { flushPending, resetPendingEvents, trackEvent } from './dataLayer';
import {
  trackCtaClick,
  trackFormSubmit,
  trackPageView,
  trackResourceFilter,
  trackResourceOpen,
  trackResourceSearch,
} from './track';

const dataLayer = () => window.dataLayer ?? [];

beforeEach(() => {
  window.localStorage.clear();
  window.dataLayer = [];
  resetPendingEvents();
});

describe('consent gate', () => {
  it('defaults to denied', () => {
    // An opt-out default would make the gate decorative. Nothing is measured
    // until the visitor agrees.
    expect(readConsent()).toBe('unset');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('drops events entirely while consent is withheld', () => {
    setConsent('denied');
    trackCtaClick({ name: 'Explore', location: 'hero', destination: '/platform' });

    expect(dataLayer()).toHaveLength(0);
  });

  it('records events after consent is granted', () => {
    setConsent('granted');
    trackCtaClick({ name: 'Explore', location: 'hero', destination: '/platform' });

    expect(dataLayer()).toHaveLength(1);
  });

  it('remembers the choice across page loads', () => {
    setConsent('granted');

    expect(readConsent()).toBe('granted');
    expect(window.localStorage.getItem('nh-analytics-consent')).toBe('granted');
  });

  it('survives storage being unavailable', () => {
    // localStorage throws in some private browsing modes. Analytics failing
    // must never take the page down with it.
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => readConsent()).not.toThrow();
    expect(readConsent()).toBe('unset');

    getItem.mockRestore();
  });
});

describe('pending events', () => {
  it('replays events captured before consent was granted', () => {
    // Someone who accepts after reading the banner should still have their
    // arrival counted, rather than the first page view being lost.
    trackPageView({ path: '/', title: 'Home' });
    expect(dataLayer()).toHaveLength(0);

    setConsent('granted');
    flushPending();

    expect(dataLayer()).toHaveLength(1);
    expect(dataLayer()[0]).toMatchObject({ event: 'page_view', page_path: '/' });
  });

  it('bounds the queue so a visitor who never consents cannot grow it forever', () => {
    for (let i = 0; i < 50; i += 1) {
      trackPageView({ path: `/page-${i}`, title: 'Page' });
    }

    setConsent('granted');
    flushPending();

    expect(dataLayer().length).toBeLessThanOrEqual(20);
  });
});

describe('dataLayer facade', () => {
  beforeEach(() => setConsent('granted'));

  it('creates the array when no container has initialised it', () => {
    delete window.dataLayer;
    trackPageView({ path: '/', title: 'Home' });

    expect(window.dataLayer).toHaveLength(1);
  });

  it('appends rather than replacing what a container already queued', () => {
    window.dataLayer = [{ event: 'gtm.js' }];
    trackPageView({ path: '/', title: 'Home' });

    expect(dataLayer()).toHaveLength(2);
    expect(dataLayer()[0]).toMatchObject({ event: 'gtm.js' });
  });
});

describe('event payloads', () => {
  beforeEach(() => setConsent('granted'));

  it('emits only event names declared in the plan', () => {
    trackPageView({ path: '/', title: 'Home' });
    trackCtaClick({ name: 'Explore', location: 'hero', destination: '/platform' });
    trackResourceSearch('access', 4);
    trackResourceFilter('category', 'digital-health', 3);
    trackResourceOpen({ id: 'res-001', title: 'A title', category: 'digital-health', position: 2 });
    trackFormSubmit('contact', 'success');

    const names = dataLayer().map((entry) => (entry as { event: string }).event);
    expect(names).toEqual(ANALYTICS_EVENTS.slice());
  });

  it('uses GA4 snake_case parameter names', () => {
    // GTM maps these straight onto GA4 custom event parameters. camelCase here
    // would mean a translation layer in the container, or silently empty
    // dimensions in reports.
    trackResourceOpen({ id: 'res-001', title: 'A title', category: 'digital-health', position: 2 });

    expect(dataLayer()[0]).toEqual({
      event: 'resource_open',
      resource_id: 'res-001',
      resource_title: 'A title',
      resource_category: 'digital-health',
      list_position: 2,
    });
  });

  it('records a zero-result search rather than skipping it', () => {
    // Searches that find nothing are the most useful ones in the report.
    trackResourceSearch('zzzz', 0);

    expect(dataLayer()[0]).toMatchObject({ search_term: 'zzzz', results_count: 0 });
  });

  it('reports failed form submissions with field names but no values', () => {
    trackFormSubmit('contact', 'error', ['email', 'message']);

    const payload = dataLayer()[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      event: 'form_submit',
      form_name: 'contact',
      form_status: 'error',
      error_fields: ['email', 'message'],
    });
    // A contact form carries names, addresses and free text; none of it belongs
    // in an analytics payload.
    expect(JSON.stringify(payload)).not.toMatch(/@|\bname\b.*:/i);
  });

  it('omits error_fields entirely on success', () => {
    trackFormSubmit('contact', 'success');

    expect(dataLayer()[0]).not.toHaveProperty('error_fields');
  });
});

describe('server rendering', () => {
  it('is a no-op when there is no window', () => {
    // trackEvent runs during SSR through shared components; touching window
    // there would break the build rather than lose a metric.
    const originalWindow = global.window;
    // @ts-expect-error deliberately simulating a non-browser environment
    delete global.window;

    expect(() => trackEvent({ event: 'page_view', page_path: '/', page_title: 'x' })).not.toThrow();

    global.window = originalWindow;
  });
});
