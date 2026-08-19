import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GatsbyNode } from 'gatsby';
import sharp from 'sharp';
import config from './gatsby-config';
import { queryResources } from './src/lib/content/resource-query';
import { resources } from './src/lib/content/source';
import {
  APPLE_TOUCH_ICON_FILENAME,
  APPLE_TOUCH_ICON_SIZE,
  FAVICON_PNG_FILENAME,
  FAVICON_PNG_SIZE,
  FAVICON_SVG_FILENAME,
  buildFaviconSvg,
} from './src/lib/seo/favicon';
import { OG_IMAGE_FILENAME, buildOgImageSvg } from './src/lib/seo/og-image';
import { buildRobotsTxt } from './src/lib/seo/robots';

/**
 * Mirrors the `@/*` path alias from tsconfig.json into webpack.
 *
 * TypeScript's `paths` only affects type resolution; the bundler needs the same
 * mapping or imports fail at build time. Jest needs a third copy in its
 * moduleNameMapper. All three must stay in sync.
 */
export const onCreateWebpackConfig: GatsbyNode['onCreateWebpackConfig'] = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  });
};

/**
 * Renders the first page of the library into the static HTML.
 *
 * The library is interactive and fetches from /api/resources as filters change,
 * but the unfiltered first page never changes between builds. Injecting it as
 * page context means the served HTML contains real resource cards, so search
 * engines and readers without JavaScript get content rather than a skeleton,
 * and returning visitors see no loading flash on first paint.
 *
 * The component still receives it through the same typed response shape the API
 * returns, so there is one rendering path rather than two.
 */
export const onCreatePage: GatsbyNode['onCreatePage'] = ({ page, actions }) => {
  if (page.path !== '/resources/') return;

  const { createPage, deletePage } = actions;

  // createPage on an existing path would be a duplicate; the page has to be
  // replaced rather than added to.
  deletePage(page);
  createPage({
    ...page,
    context: {
      ...page.context,
      initialResources: queryResources(resources),
    },
  });
};

/**
 * One statically generated page per resource.
 *
 * Built from the content source directly rather than through the REST endpoint:
 * the endpoint does not exist during a build, and going over HTTP to reach data
 * already in memory would be indirection with no benefit.
 */
export const createPages: GatsbyNode['createPages'] = ({ actions }) => {
  const template = path.resolve(__dirname, 'src/templates/ResourceDetail.tsx');

  for (const resource of resources) {
    /*
     * Related resources are chosen at build time: same category, most recent
     * first, excluding the resource itself. Computing this here keeps the
     * template free of selection logic and costs nothing at runtime.
     */
    const related = resources
      .filter((other) => other.category === resource.category && other.id !== resource.id)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 3);

    actions.createPage({
      path: `/resources/${resource.slug}`,
      component: template,
      context: { resource, related },
    });
  }
};

/**
 * Build artefacts that are not pages: robots.txt and the social card.
 *
 * Both belong here rather than in static/ because both depend on the origin
 * this build was given (SITE_URL, or Netlify's DEPLOY_PRIME_URL / URL). A
 * committed robots.txt would either hard-code a production URL into the
 * repository or omit the sitemap line entirely, and a committed PNG would go
 * stale the first time the wording on it changed.
 *
 * The card is rasterised with sharp, which is already installed for
 * gatsby-plugin-sharp and is declared as a dependency so `npm ci` is
 * deterministic about it.
 */
export const onPostBuild: GatsbyNode['onPostBuild'] = async ({ reporter }) => {
  const siteUrl =
    typeof config.siteMetadata?.siteUrl === 'string' ? config.siteMetadata.siteUrl : undefined;

  await fs.writeFile(path.join('public', 'robots.txt'), buildRobotsTxt(siteUrl), 'utf8');

  const svg = buildOgImageSvg({
    siteName: 'NovaHealth',
    // Pre-wrapped: laying out text at build time would mean measuring glyphs.
    headlineLines: ['Healthcare, designed', 'around people.'],
    summary: 'Scheduling, unified records and care team messaging in one connected experience.',
    footnote: 'A fictional demonstration project. Not a real healthcare service.',
  });

  /*
   * Palette-quantised: the card is flat colour over one gradient, so 256
   * colours are indistinguishable from truecolour here and halve the file
   * (70 kB → 34 kB). It is fetched by crawlers rather than by readers, so this
   * is politeness rather than page performance.
   */
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join('public', OG_IMAGE_FILENAME));

  /*
   * The site icon, in the three forms browsers actually ask for. Without a
   * declared icon every page view spends a request on /favicon.ico and logs a
   * 404 to the console.
   */
  const faviconSvg = buildFaviconSvg();
  await fs.writeFile(path.join('public', FAVICON_SVG_FILENAME), faviconSvg, 'utf8');

  await sharp(Buffer.from(faviconSvg))
    .resize(FAVICON_PNG_SIZE, FAVICON_PNG_SIZE)
    .png({ compressionLevel: 9 })
    .toFile(path.join('public', FAVICON_PNG_FILENAME));

  await sharp(Buffer.from(faviconSvg))
    .resize(APPLE_TOUCH_ICON_SIZE, APPLE_TOUCH_ICON_SIZE)
    .png({ compressionLevel: 9 })
    .toFile(path.join('public', APPLE_TOUCH_ICON_FILENAME));

  reporter.info(
    siteUrl && !siteUrl.startsWith('http://localhost')
      ? `Wrote robots.txt, ${OG_IMAGE_FILENAME} and the site icons for ${siteUrl}`
      : `Wrote robots.txt, ${OG_IMAGE_FILENAME} and the site icons. No SITE_URL was set, so absolute URLs are omitted.`,
  );
};
