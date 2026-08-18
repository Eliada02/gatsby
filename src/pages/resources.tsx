import type { HeadFC, PageProps } from 'gatsby';
import { Layout } from '@/components/layout/Layout';
import { ResourceLibrary } from '@/components/resources/ResourceLibrary';
import { ResourcesHero } from '@/components/resources/ResourcesHero';
import { FinalCta } from '@/components/sections/FinalCta';
import { Seo } from '@/components/seo/Seo';
import { homeContent } from '@/lib/content/source';
import type { ResourceListResponse } from '@/types/api';

/**
 * Context supplied by onCreatePage in gatsby-node.ts.
 *
 * Optional because Gatsby renders the page during development before the hook
 * has run, and a missing payload only means the library fetches on mount.
 */
export interface ResourcesPageContext {
  initialResources?: ResourceListResponse;
}

/**
 * The resource library route.
 *
 * `location.search` comes from the router and is passed straight down: the URL
 * is the source of truth for search, category, sort and page, so the page holds
 * no filter state of its own.
 *
 * The closing call to action is shared with the home page rather than
 * duplicated. It is site-level copy, and two copies would drift.
 */
const ResourcesPage = ({ location, pageContext }: PageProps<object, ResourcesPageContext>) => (
  <Layout>
    <ResourcesHero />
    <ResourceLibrary search={location.search} initialData={pageContext.initialResources} />
    <FinalCta content={homeContent.finalCta} />
  </Layout>
);

export default ResourcesPage;

export const Head: HeadFC = () => (
  <Seo
    title="Resources"
    description="Practical writing on patient experience, interoperability, clinical operations and healthcare security, searchable by topic and format."
  />
);
