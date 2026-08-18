import type { AnalyticsLocation } from '@/types/analytics';
import { trackEvent } from './dataLayer';

/**
 * Named helpers for each event in the plan.
 *
 * Call sites use these rather than assembling event objects, so a component
 * never has to know a parameter name. The names are then defined in exactly two
 * places: the type in types/analytics.ts and the helper here.
 *
 * There is no `useAnalytics` hook. A hook exists to reach state, context or the
 * lifecycle, and none of these need any of that — they are pure calls. Wrapping
 * them in a hook would add an import, a rules-of-hooks constraint and a
 * memoisation question in exchange for nothing.
 */

export function trackCtaClick(params: {
  name: string;
  location: AnalyticsLocation;
  destination: string;
}): void {
  trackEvent({
    event: 'cta_click',
    cta_name: params.name,
    cta_location: params.location,
    destination: params.destination,
  });
}

export function trackResourceSearch(searchTerm: string, resultsCount: number): void {
  trackEvent({
    event: 'resource_search',
    search_term: searchTerm,
    results_count: resultsCount,
  });
}

export function trackResourceFilter(
  filterType: 'category' | 'sort',
  filterValue: string,
  resultsCount: number,
): void {
  trackEvent({
    event: 'resource_filter',
    filter_type: filterType,
    filter_value: filterValue,
    results_count: resultsCount,
  });
}

export function trackResourceOpen(params: {
  id: string;
  title: string;
  category: string;
  position: number;
}): void {
  trackEvent({
    event: 'resource_open',
    resource_id: params.id,
    resource_title: params.title,
    resource_category: params.category,
    list_position: params.position,
  });
}

export function trackFormSubmit(
  formName: string,
  status: 'success' | 'error',
  errorFields?: string[],
): void {
  trackEvent({
    event: 'form_submit',
    form_name: formName,
    form_status: status,
    // Field names only. Values from a contact form are personal data and have
    // no place in an analytics payload.
    ...(errorFields && errorFields.length > 0 ? { error_fields: errorFields } : {}),
  });
}

export function trackPageView(params: {
  path: string;
  title: string;
  referrerPath?: string;
}): void {
  trackEvent({
    event: 'page_view',
    page_path: params.path,
    page_title: params.title,
    ...(params.referrerPath ? { referrer_path: params.referrerPath } : {}),
  });
}
