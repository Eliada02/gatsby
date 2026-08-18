/**
 * The tracking plan, expressed as types.
 *
 * The most common cause of broken analytics on a content site is not missing
 * instrumentation, it is inconsistent naming: `cta_click` in one component and
 * `ctaClick` in another, `search_term` here and `searchTerm` there. Reports are
 * built on the first spelling, a later change ships the second, and the data
 * goes quietly wrong for weeks before anyone notices.
 *
 * Encoding the plan as a discriminated union makes that a compile error. A
 * misspelled event name, a missing parameter or a wrong value type fails the
 * build rather than failing silently in production.
 *
 * Naming follows GA4 conventions - snake_case events and parameters - so the
 * payloads map onto GA4 custom events through GTM without a translation layer.
 *
 * Note on `resource_download`: the original plan included it, and it is
 * deliberately absent. Nothing in the site offers a download, so defining the
 * event would put an entry in the tracking plan that a data team would build a
 * report around and then wait indefinitely for. It gets defined when a download
 * surface exists.
 */

/** Where in the page an interaction happened. Kept to a small set so reports can group by it. */
export type AnalyticsLocation =
  | 'hero'
  | 'header'
  | 'footer'
  | 'platform_overview'
  | 'impact_calculator'
  | 'security_preview'
  | 'final_cta'
  | 'resource_library'
  | 'resource_detail'
  | 'contact';

export interface PageViewEvent {
  event: 'page_view';
  page_path: string;
  page_title: string;
  /** Absent on the first view of a session. */
  referrer_path?: string;
}

export interface CtaClickEvent {
  event: 'cta_click';
  cta_name: string;
  cta_location: AnalyticsLocation;
  destination: string;
}

export interface ResourceSearchEvent {
  event: 'resource_search';
  search_term: string;
  /** Recorded with the outcome, so zero-result searches are analysable. */
  results_count: number;
}

export interface ResourceFilterEvent {
  event: 'resource_filter';
  filter_type: 'category' | 'sort';
  filter_value: string;
  results_count: number;
}

export interface ResourceOpenEvent {
  event: 'resource_open';
  resource_id: string;
  resource_title: string;
  resource_category: string;
  /** 1-based position in the results list, for click-through analysis. */
  list_position: number;
}

export interface FormSubmitEvent {
  event: 'form_submit';
  form_name: string;
  form_status: 'success' | 'error';
  /**
   * Field names only, never values. A contact form carries names, email
   * addresses and free text, none of which belongs in an analytics payload.
   */
  error_fields?: string[];
}

export type AnalyticsEvent =
  | PageViewEvent
  | CtaClickEvent
  | ResourceSearchEvent
  | ResourceFilterEvent
  | ResourceOpenEvent
  | FormSubmitEvent;

export type AnalyticsEventName = AnalyticsEvent['event'];

/** Every event the site is allowed to emit. Used to validate pushes in tests. */
export const ANALYTICS_EVENTS = [
  'page_view',
  'cta_click',
  'resource_search',
  'resource_filter',
  'resource_open',
  'form_submit',
] as const satisfies readonly AnalyticsEventName[];
