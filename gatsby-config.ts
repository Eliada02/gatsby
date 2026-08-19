import type { GatsbyConfig } from 'gatsby';

/**
 * Canonical origin. Netlify exposes the deploy URL as URL/DEPLOY_PRIME_URL, so
 * preview builds emit correct canonical + Open Graph tags instead of pointing
 * at production.
 *
 * The localhost fallback is deliberate and load-bearing: a build with no origin
 * configured produces obviously-wrong canonical URLs rather than silently
 * claiming to be production. src/lib/seo/urls.ts treats it as "unknown origin".
 */
const siteUrl =
  process.env.SITE_URL ??
  process.env.DEPLOY_PRIME_URL ??
  process.env.URL ??
  'http://localhost:8000';

const config: GatsbyConfig = {
  siteMetadata: {
    title: 'NovaHealth',
    titleTemplate: '%s | NovaHealth',
    /*
     * Fallback description, used by any page that does not set its own. It
     * describes what this site actually is: an earlier draft described a
     * therapeutics pipeline, which is not what the site shows and is not a
     * claim a fictional company should be making in metadata either.
     */
    description:
      'NovaHealth is a demonstration of a connected digital health experience: scheduling, unified records and care team messaging, built around the person receiving care.',
    siteUrl,
    locale: 'en',
    organization: {
      name: 'NovaHealth',
      legalName: 'NovaHealth Therapeutics',
      tagline: 'Advancing science. Improving lives.',
    },
    /*
     * One social card for the whole site, generated into public/ at build time
     * from src/lib/seo/og-image.ts. A per-page image would mean a build-time
     * render per route for no measurable benefit at this size of site.
     */
    socialImage: '/og-image.png',
    socialImageAlt:
      'NovaHealth — healthcare, designed around people. A fictional demonstration project.',
  },

  // Gatsby defaults to the classic JSX runtime (React.createElement), which
  // requires a React import in every file. tsconfig and the Jest transform both
  // use the automatic runtime; without this line the three disagree and SSR
  // fails with "React is not defined" while type-checking and tests pass.
  jsxRuntime: 'automatic',

  graphqlTypegen: true,

  plugins: [
    'gatsby-plugin-image',
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    {
      // Images are sourced into the GraphQL layer because gatsby-plugin-image
      // needs them there. Structured content is not: it is imported directly by
      // src/lib/content/source.ts, which both the build and the REST handlers
      // read from. Sourcing it twice would create two paths to the same data.
      resolve: 'gatsby-source-filesystem',
      options: { name: 'images', path: `${__dirname}/src/images` },
    },
    {
      /*
       * The sitemap is generated from the pages Gatsby actually built, so a new
       * resource appears in it without anyone maintaining a list. The official
       * plugin is used rather than a hand-rolled generator for the same reason.
       *
       * 404 pages are excluded: they are not content, and submitting them
       * invites a crawler to index an error page. API routes are Functions
       * rather than pages, so they never appear here in the first place.
       */
      resolve: 'gatsby-plugin-sitemap',
      options: {
        excludes: ['/404', '/404/', '/404.html', '/dev-404-page/'],
      },
    },
  ],
};

export default config;
