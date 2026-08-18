import type { GatsbyConfig } from 'gatsby';

/**
 * Canonical origin. Netlify exposes the deploy URL as URL/DEPLOY_PRIME_URL, so
 * preview builds emit correct canonical + Open Graph tags instead of pointing
 * at production.
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
    description:
      'NovaHealth advances translational science into approved therapies, pairing rigorous clinical research with patient-centred care.',
    siteUrl,
    locale: 'en',
    organization: {
      name: 'NovaHealth',
      legalName: 'NovaHealth Therapeutics',
      tagline: 'Advancing science. Improving lives.',
    },
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
  ],
};

export default config;
