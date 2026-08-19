import type { GatsbySSR } from 'gatsby';
import config from './gatsby-config';
import {
  APPLE_TOUCH_ICON_FILENAME,
  FAVICON_PNG_FILENAME,
  FAVICON_PNG_SIZE,
  FAVICON_SVG_FILENAME,
} from './src/lib/seo/favicon';

/**
 * Initialises the dataLayer and, when a container is configured, loads Google
 * Tag Manager.
 *
 * The dataLayer array is created before the container script so events fired
 * during page initialisation are queued rather than lost. That ordering is the
 * usual cause of a missing first page_view.
 *
 * No container ID is set in this repository, so no third-party script is
 * loaded. The site is GTM-ready rather than GTM-connected: loading someone
 * else's container would add a request, a cookie and a privacy obligation for
 * a demonstration project. Setting GATSBY_GTM_ID switches it on.
 *
 * It also sets the document language, which nothing else can: the Head API
 * renders into <head> and cannot reach the <html> element.
 */
const GTM_ID = process.env.GATSBY_GTM_ID;

/**
 * Document language, taken from siteMetadata so there is one source of truth.
 *
 * Without lang, a screen reader reads the page with whatever voice and
 * pronunciation rules the user's synthesiser defaults to — English content read
 * by a German voice, for instance. It is WCAG 3.1.1 at level A, and Gatsby does
 * not set it for you.
 */
const configuredLocale = config.siteMetadata?.locale;
const SITE_LANG = typeof configuredLocale === 'string' ? configuredLocale : 'en';

export const onRenderBody: GatsbySSR['onRenderBody'] = ({
  setHeadComponents,
  setHtmlAttributes,
  setPreBodyComponents,
}) => {
  setHtmlAttributes({ lang: SITE_LANG });

  /*
   * Site icons. Declared here rather than in the Seo component because they are
   * identical on every page: there is nothing for a per-page Head to decide,
   * and a link that never changes should not be diffed on every route change.
   *
   * Declaring them also stops the browser requesting /favicon.ico on its own,
   * which is what produced a 404 on every page view before they existed.
   */
  const head = [
    <link key="nh-icon-svg" rel="icon" href={`/${FAVICON_SVG_FILENAME}`} type="image/svg+xml" />,
    <link
      key="nh-icon-png"
      rel="icon"
      href={`/${FAVICON_PNG_FILENAME}`}
      type="image/png"
      sizes={`${FAVICON_PNG_SIZE}x${FAVICON_PNG_SIZE}`}
    />,
    <link key="nh-apple-icon" rel="apple-touch-icon" href={`/${APPLE_TOUCH_ICON_FILENAME}`} />,
    <script
      key="nh-datalayer-init"
      dangerouslySetInnerHTML={{ __html: 'window.dataLayer = window.dataLayer || [];' }}
    />,
  ];

  if (GTM_ID) {
    head.push(
      <script
        key="nh-gtm"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />,
    );

    // The noscript iframe is part of the standard snippet. It is title-less in
    // Google's version, which fails axe; the title makes it describable.
    setPreBodyComponents([
      <noscript key="nh-gtm-noscript">
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>,
    ]);
  }

  setHeadComponents(head);
};
