/**
 * URL construction for metadata.
 *
 * Canonical, Open Graph and JSON-LD all need the same thing: an absolute URL
 * built from one origin and one path. Doing that inline in a component is how
 * sites end up with `https://example.com//about/`, a canonical pointing at
 * localhost in production, or two pages claiming the same canonical.
 *
 * The origin comes from siteMetadata.siteUrl, which is set from SITE_URL (or
 * Netlify's DEPLOY_PRIME_URL / URL) at build time.
 */

/**
 * Origins that mean "nobody configured one".
 *
 * A localhost canonical in a production build is worse than no canonical: it
 * tells a crawler the authoritative copy of the page lives somewhere it cannot
 * reach. When the origin is unknown the metadata omits absolute URLs instead of
 * inventing them, and the omission is visible in the build output.
 */
const PLACEHOLDER_ORIGINS = ['http://localhost:8000', 'http://localhost'];

export function isConfiguredOrigin(siteUrl: string | undefined): siteUrl is string {
  if (!siteUrl) return false;
  return !PLACEHOLDER_ORIGINS.some((placeholder) => siteUrl.startsWith(placeholder));
}

/** Removes any trailing slash, so joins never produce a doubled one. */
function normaliseOrigin(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, '');
}

/**
 * Normalises a page path to the form the site actually serves.
 *
 * Gatsby's default trailing-slash mode is `always`, so `/about` and `/about/`
 * are the same page and only one of them may be canonical. Everything is
 * normalised to the trailing-slash form, with `/` left as `/`.
 */
export function normalisePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';

  const [pathOnly = ''] = pathname.split(/[?#]/);
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

/**
 * Absolute URL for a page, or undefined when no origin is configured.
 *
 * Returning undefined rather than a relative URL is deliberate: a canonical or
 * og:url that is not absolute is invalid, and half-correct metadata is harder
 * to notice than none.
 */
export function buildCanonicalUrl(
  siteUrl: string | undefined,
  pathname: string,
): string | undefined {
  if (!isConfiguredOrigin(siteUrl)) return undefined;
  return `${normaliseOrigin(siteUrl)}${normalisePathname(pathname)}`;
}

/**
 * Absolute URL for an asset such as the social image.
 *
 * Paths are resolved against the origin; an already-absolute URL is passed
 * through, so a CDN-hosted card needs no special case.
 */
export function buildAssetUrl(
  siteUrl: string | undefined,
  assetPath: string | undefined,
): string | undefined {
  if (!assetPath) return undefined;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  if (!isConfiguredOrigin(siteUrl)) return undefined;

  const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${normaliseOrigin(siteUrl)}${path}`;
}

/**
 * Applies siteMetadata.titleTemplate.
 *
 * The template lives in configuration rather than in the component, so the site
 * name appears in exactly one place. A page that already reads as a full title
 * — the home page — opts out.
 */
export function applyTitleTemplate(
  title: string,
  template: string | undefined,
  appendSiteName: boolean,
): string {
  if (!appendSiteName || !template) return title;
  return template.replace('%s', title);
}
