import type { GatsbyBrowser } from 'gatsby';
import { trackPageView } from './src/lib/analytics/track';

// Self-hosted variable font (weights 200-800 in one file). Imported before the
// global stylesheet so the @font-face rules are registered first.
import '@fontsource-variable/plus-jakarta-sans/wght.css';

import './src/styles/global.css';

/**
 * Records a page view on every route change.
 *
 * Gatsby is a single-page application after the first load, so a container's
 * built-in pageview trigger fires once and then never again. Client-side
 * navigations have to be reported explicitly or every page after the entry
 * point is missing from the report.
 *
 * The document title is read on the next tick. Gatsby's Head API updates the
 * title after the route transition commits, so reading it synchronously here
 * records the previous page's title against the new path.
 */
export const onRouteUpdate: GatsbyBrowser['onRouteUpdate'] = ({ location, prevLocation }) => {
  window.setTimeout(() => {
    trackPageView({
      path: location.pathname,
      title: document.title,
      ...(prevLocation ? { referrerPath: prevLocation.pathname } : {}),
    });
  }, 0);
};
