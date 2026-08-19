/**
 * The site icon.
 *
 * Added in the performance phase because Lighthouse caught what nobody notices
 * locally: with no icon declared, every browser silently requests
 * /favicon.ico, and every one of those requests 404s. That is a console error
 * and a wasted round trip on every page view.
 *
 * The mark is the one the wordmark uses — a cross with an emerald centre —
 * redrawn on a filled tile. An icon rendered at 16px cannot carry the outline
 * treatment the header logo uses, and a transparent mark disappears against a
 * dark browser theme.
 *
 * Like the social card, this is pure markup so it can be tested without
 * rasterising anything; gatsby-node.ts writes the SVG and renders the PNG
 * fallbacks in onPostBuild.
 */

/** Rendered from the SVG at build time. 32px is the size browsers pick for tabs. */
export const FAVICON_PNG_SIZE = 32;

/** iOS home-screen icon. 180px is the size Apple has asked for since iOS 8. */
export const APPLE_TOUCH_ICON_SIZE = 180;

export const FAVICON_SVG_FILENAME = 'favicon.svg';
export const FAVICON_PNG_FILENAME = 'favicon-32.png';
export const APPLE_TOUCH_ICON_FILENAME = 'apple-touch-icon.png';

/*
 * From src/styles/tokens.css. Repeated here for the same reason as the social
 * card: an SVG rasterised outside the browser cannot read custom properties.
 */
const BACKGROUND = '#0f172a'; // --nh-slate-900
const STROKE = '#ffffff'; // --nh-color-text-inverse
const CENTRE = '#10b981'; // --nh-emerald-500

/**
 * Returns the icon as SVG markup.
 *
 * Geometry only — no text and no gradient. Both are unreadable at 16px, and
 * text would additionally depend on a font being installed wherever the PNG
 * fallbacks are rendered.
 */
export function buildFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="NovaHealth">
  <rect width="64" height="64" rx="14" fill="${BACKGROUND}"/>
  <path d="M32 16V48M16 32H48" stroke="${STROKE}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="8" fill="${CENTRE}"/>
</svg>
`;
}
