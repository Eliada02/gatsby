import { graphql, useStaticQuery } from 'gatsby';

/**
 * Site-wide metadata, read once.
 *
 * The values live in gatsby-config.ts so that the origin can come from the
 * environment (SITE_URL, or Netlify's DEPLOY_PRIME_URL / URL) rather than being
 * written into components. A static query is the only way to reach them from a
 * Head export: Head renders outside the page's React tree, so context is not
 * available, but Gatsby provides the static-query results to it in both the
 * server and browser renderers.
 *
 * The shape is declared here rather than taken from Queries.* because the
 * generated types are not committed — see the note in .gitignore — and a
 * typecheck must not depend on a prior build.
 */

export interface SiteMetadata {
  title: string;
  titleTemplate: string;
  description: string;
  siteUrl: string;
  locale: string;
  organization: {
    name: string;
    legalName: string;
    tagline: string;
  };
  socialImage: string;
  socialImageAlt: string;
}

interface SiteMetadataQueryResult {
  site: { siteMetadata: SiteMetadata };
}

export function useSiteMetadata(): SiteMetadata {
  const data = useStaticQuery<SiteMetadataQueryResult>(graphql`
    query SiteMetadata {
      site {
        siteMetadata {
          title
          titleTemplate
          description
          siteUrl
          locale
          organization {
            name
            legalName
            tagline
          }
          socialImage
          socialImageAlt
        }
      }
    }
  `);

  return data.site.siteMetadata;
}
