import { isConfiguredOrigin } from './urls';

/**
 * robots.txt.
 *
 * Written at the end of a build rather than committed as a static file,
 * because the one line that matters — the sitemap URL — has to be absolute and
 * therefore depends on the origin the build was given.
 *
 * What this file deliberately does not do:
 *
 * It does not disallow /api/. The resource library fetches /api/resources from
 * the browser, so a crawler rendering the page needs that request to succeed;
 * blocking it would degrade how the library is understood, to prevent the
 * indexing of a JSON document nobody will search for. Blocking a path here also
 * has nothing to do with security — robots.txt is a request, not a control, and
 * anything genuinely sensitive would need authorisation instead.
 *
 * It does not disallow the 404 page either. That page carries `noindex`, which
 * is the mechanism that actually keeps it out of an index; a Disallow would
 * only stop a crawler from reading the directive.
 */

export const SITEMAP_PATH = '/sitemap-index.xml';

export function buildRobotsTxt(siteUrl: string | undefined): string {
  const lines = [
    '# NovaHealth — a fictional demonstration project.',
    '# Generated at build time by gatsby-node.ts. Do not edit in public/.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
  ];

  if (isConfiguredOrigin(siteUrl)) {
    lines.push(`Sitemap: ${siteUrl.replace(/\/+$/, '')}${SITEMAP_PATH}`);
  } else {
    /*
     * No SITE_URL was supplied, so there is no absolute URL to advertise. The
     * omission is stated rather than papered over with a localhost URL, which
     * a crawler could not use and a reviewer would have to notice.
     */
    lines.push('# No absolute sitemap URL: this build had no SITE_URL configured.');
  }

  return `${lines.join('\n')}\n`;
}
